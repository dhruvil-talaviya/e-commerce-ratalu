const Flavor = require('../models/Flavor');
const Product = require('../models/Product');
const Category = require('../models/Category');
const FAQ = require('../models/FAQ');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

// @desc    Get All Flavors & Pack Details (Catalog)
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    const { search, heat, sort, page = 1, limit = 50 } = req.query;

    const query = { status: 'Active' };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Heat Level filter
    if (heat !== undefined && heat !== '') {
      query.heat = parseInt(heat, 10);
    }

    // Sorting
    let sortBy = {};
    if (sort) {
      const parts = sort.split(':');
      sortBy[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sortBy.createdAt = -1;
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const totalRecords = await Flavor.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    const flavors = await Flavor.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limitNum);

    // Hydrate flavors with pack sizes from Product schema
    const hydratedFlavors = await Promise.all(
      flavors.map(async (flavor) => {
        const product = await Product.findOne({ flavorId: flavor.id });
        
        // Return structured flavor with nested packs matching frontend
        return {
          id: flavor.id,
          slug: flavor.slug,
          name: flavor.name,
          tagline: flavor.tagline,
          description: flavor.description,
          heat: flavor.heat,
          ingredients: flavor.ingredients,
          gradient: flavor.gradient,
          accent: flavor.accent,
          badge: flavor.badge,
          bestSeller: flavor.bestSeller,
          packs: product ? product.packs : []
        };
      })
    );

    sendResponse(res, 200, {
      success: true,
      data: hydratedFlavors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID/Slug
// @route   GET /api/v1/products/:slugOrId
// @access  Public
exports.getProduct = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;

    const flavor = await Flavor.findOne({
      $or: [{ id: slugOrId }, { slug: slugOrId }]
    });

    if (!flavor) {
      return next(new ErrorResponse('Product flavor not found', 404));
    }

    const product = await Product.findOne({ flavorId: flavor.id });

    sendResponse(res, 200, {
      success: true,
      data: {
        id: flavor.id,
        slug: flavor.slug,
        name: flavor.name,
        tagline: flavor.tagline,
        description: flavor.description,
        heat: flavor.heat,
        ingredients: flavor.ingredients,
        gradient: flavor.gradient,
        accent: flavor.accent,
        badge: flavor.badge,
        bestSeller: flavor.bestSeller,
        packs: product ? product.packs : []
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Add Product & Packs
// @route   POST /api/v1/products
// @access  Private (Admin only)
exports.createProduct = async (req, res, next) => {
  try {
    const { name, tagline, description, heat, ingredients, gradient, accent, badge, bestSeller, packs } = req.body;

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const id = slug;

    // Check if flavor exists
    let existing = await Flavor.findOne({ id });
    if (existing) {
      return next(new ErrorResponse('Product name already exists', 400));
    }

    // Create Flavor
    const flavor = await Flavor.create({
      name,
      slug,
      tagline,
      description,
      heat,
      ingredients,
      gradient,
      accent,
      badge: badge === 'None' ? undefined : badge,
      bestSeller
    });

    // Default package layout
    const defaultPacks = packs || [
      { id: '100g', label: '100g', grams: 100, price: 99, note: 'Snack pack', stock: 100 },
      { id: '200g', label: '200g', grams: 200, price: 179, compareAt: 198, note: 'Most loved', stock: 100 },
      { id: '500g', label: '500g', grams: 500, price: 399, compareAt: 495, note: 'Family size', stock: 100 },
      { id: '1kg', label: '1kg', grams: 1000, price: 749, compareAt: 990, note: 'Best value', stock: 100 }
    ];

    // Create Product link
    const product = await Product.create({
      flavorId: id,
      packs: defaultPacks
    });

    // Populate inventory items
    const Inventory = require('../models/Inventory');
    for (const p of defaultPacks) {
      await Inventory.findOneAndUpdate(
        { flavorId: id, packId: p.id },
        { currentStock: p.stock },
        { upsert: true }
      );
    }

    // Log admin audit activity
    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role || 'Admin',
      action: `Created new flavor catalog product: ${name}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 201, {
      success: true,
      message: 'Product added successfully',
      data: {
        id: flavor.id,
        name: flavor.name,
        packs: product.packs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Edit Product / Packs
// @route   PUT /api/v1/products/:id
// @access  Private (Admin only)
exports.updateProduct = async (req, res, next) => {
  try {
    const flavorId = req.params.id;

    let flavor = await Flavor.findOne({ id: flavorId });
    if (!flavor) {
      return next(new ErrorResponse('Product not found', 404));
    }

    const { name, tagline, description, heat, ingredients, gradient, accent, badge, bestSeller, packs } = req.body;

    // Update flavor properties
    if (name) {
      flavor.name = name;
      flavor.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (tagline) flavor.tagline = tagline;
    if (description) flavor.description = description;
    if (heat !== undefined) flavor.heat = heat;
    if (ingredients) flavor.ingredients = ingredients;
    if (gradient) flavor.gradient = gradient;
    if (accent) flavor.accent = accent;
    flavor.badge = badge === 'None' ? undefined : badge;
    if (bestSeller !== undefined) flavor.bestSeller = bestSeller;

    await flavor.save();

    // If packs are updated, update Product record as well
    if (packs) {
      await Product.findOneAndUpdate(
        { flavorId: flavorId },
        { packs: packs }
      );

      // Synch inventory
      const Inventory = require('../models/Inventory');
      for (const p of packs) {
        if (p.stock !== undefined) {
          await Inventory.findOneAndUpdate(
            { flavorId: flavorId, packId: p.id },
            { currentStock: p.stock },
            { upsert: true }
          );
        }
      }
    }

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role || 'Admin',
      action: `Updated product properties for: ${flavor.name}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Product updated successfully',
      data: flavor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Delete Product
// @route   DELETE /api/v1/products/:id
// @access  Private (Admin only)
exports.deleteProduct = async (req, res, next) => {
  try {
    const flavorId = req.params.id;

    const flavor = await Flavor.findOneAndDelete({ id: flavorId });
    if (!flavor) {
      return next(new ErrorResponse('Product not found', 404));
    }

    await Product.findOneAndDelete({ flavorId });
    
    // Clear inventory
    const Inventory = require('../models/Inventory');
    await Inventory.deleteMany({ flavorId });

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role || 'Admin',
      action: `Deleted product flavor from catalog: ${flavorId}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Categories
// @route   GET /api/v1/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ sorting: 1 });
    sendResponse(res, 200, {
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Create Category
// @route   POST /api/v1/categories
// @access  Private (Admin only)
exports.createCategory = async (req, res, next) => {
  try {
    const { name, status } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const cat = await Category.create({
      name,
      slug,
      status: status || 'Active'
    });

    sendResponse(res, 201, {
      success: true,
      message: 'Category created successfully',
      data: cat
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Delete Category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin only)
exports.deleteCategory = async (req, res, next) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) {
      return next(new ErrorResponse('Category not found', 404));
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Category deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get FAQ items
// @route   GET /api/v1/faqs
// @access  Public
exports.getFaqs = async (req, res, next) => {
  try {
    const faqs = await FAQ.find({ active: true });
    sendResponse(res, 200, {
      success: true,
      data: faqs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Review list
// @route   GET /api/v1/reviews
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ active: true }).sort({ createdAt: -1 });
    sendResponse(res, 200, {
      success: true,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Write a Product Review
// @route   POST /api/v1/reviews
// @access  Public (Optional Customer verification check)
exports.createReview = async (req, res, next) => {
  try {
    const { name, location, rating, quote, flavor } = req.body;

    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Color gradient map for avatar
    const grads = [
      { from: '#7a3f9c', to: '#5b2c6f' },
      { from: '#ec8a35', to: '#c9691a' },
      { from: '#e0452e', to: '#c9291a' },
      { from: '#4a4a52', to: '#2c2c2c' }
    ];
    const avatarGradient = grads[Math.floor(Math.random() * grads.length)];

    const review = await Review.create({
      name,
      location,
      rating,
      quote,
      flavor,
      initials,
      avatarGradient
    });

    sendResponse(res, 201, {
      success: true,
      message: 'Review posted successfully',
      data: review
    });
  } catch (error) {
    next(error);
  }
};
