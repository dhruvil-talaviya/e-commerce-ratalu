const Flavor = require('../models/Flavor');
const Product = require('../models/Product');
const Category = require('../models/Category');
const FAQ = require('../models/FAQ');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

/**
 * Real rating for every product, computed from APPROVED reviews.
 *
 * The product page used to print a hardcoded "4.9" regardless of what customers
 * had actually said — a number invented in code and shown as if it were earned.
 * This returns the truth, including a `count` of 0, so the UI can honestly show
 * nothing rather than a fabricated score.
 *
 * Reviews link to a product by flavour NAME (Review.flavor === Flavor.name), so
 * the map is keyed on the lowercased name.
 */
const buildRatingsMap = async () => {
  const rows = await Review.aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: { $toLower: '$flavor' },
        count: { $sum: 1 },
        average: { $avg: '$rating' },
        five: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        four: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        three: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        two: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        one: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
      }
    }
  ]);

  const map = new Map();
  rows.forEach((r) => {
    map.set(r._id, {
      average: Math.round(r.average * 10) / 10,
      count: r.count,
      distribution: { 5: r.five, 4: r.four, 3: r.three, 2: r.two, 1: r.one }
    });
  });
const Wishlist = require('../models/Wishlist');

/**
 * Real-time product likes count computed from Wishlist documents.
 */
const buildLikesMap = async () => {
  const rows = await Wishlist.aggregate([
    { $unwind: '$ids' },
    { $group: { _id: '$ids', count: { $sum: 1 } } }
  ]);
  const map = new Map();
  rows.forEach((r) => map.set(r._id, r.count));
  return map;
};

/** A product with no reviews yet. `count: 0` tells the UI to show nothing. */
const EMPTY_RATING = { average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

// @desc    Get All Flavors & Pack Details (Catalog)
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    const { search, heat, category, bestSeller, sort, page = 1, limit = 50 } = req.query;

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

    /**
     * Category filter. Accepts a slug (what the storefront URL carries) or an
     * id. An unknown slug returns nothing rather than silently ignoring the
     * filter and showing the whole catalogue — a filter that quietly does
     * nothing is worse than one that returns an honest empty state.
     */
    if (category) {
      const cat = await Category.findOne({
        $or: [
          { slug: category },
          ...(String(category).match(/^[0-9a-fA-F]{24}$/) ? [{ _id: category }] : [])
        ]
      }).select('_id');

      query.categoryId = cat ? cat._id : null;
      if (!cat) query._id = { $in: [] }; // no such category → no results
    }

    if (bestSeller === 'true') {
      query.bestSeller = true;
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

    const ratings = await buildRatingsMap();
    const likes = await buildLikesMap();
    const categories = await Category.find().select('name slug').lean();
    const categoryById = new Map(categories.map((c) => [String(c._id), c]));

    // Hydrate flavors with pack sizes from Product schema
    const hydratedFlavors = await Promise.all(
      flavors.map(async (flavor) => {
        const product = await Product.findOne({ flavorId: flavor.slug });
        const category = flavor.categoryId ? categoryById.get(String(flavor.categoryId)) : null;

        // Return structured flavor with nested packs matching frontend
        return {
          id: flavor.slug,
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
          maxQtyPerCheckout: flavor.maxQtyPerCheckout,
          image: flavor.image,
          inStock: flavor.inStock,
          categoryId: flavor.categoryId || null,
          // Product page content, editable from the console (was hardcoded in React).
          labels: flavor.labels || [],
          trustBadges: flavor.trustBadges || [],
          highlights: flavor.highlights || [],
          nutrition: flavor.nutrition || {},
          productInfo: flavor.productInfo || {},
          delivery: flavor.delivery || {},
          category: category ? { id: String(category._id), name: category.name, slug: category.slug } : null,
          rating: ratings.get(flavor.name.toLowerCase()) || EMPTY_RATING,
          likesCount: likes.get(flavor.slug) || likes.get(String(flavor._id)) || 0,
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

    const mongoose = require('mongoose');
    const flavor = await Flavor.findOne({
      $or: [
        { slug: slugOrId },
        ...(mongoose.Types.ObjectId.isValid(slugOrId) ? [{ _id: slugOrId }] : [])
      ]
    });

    if (!flavor) {
      return next(new ErrorResponse('Product flavor not found', 404));
    }

    const product = await Product.findOne({ flavorId: flavor.slug });

    const ratings = await buildRatingsMap();
    const likes = await buildLikesMap();
    const category = flavor.categoryId
      ? await Category.findById(flavor.categoryId).select('name slug').lean()
      : null;

    sendResponse(res, 200, {
      success: true,
      data: {
        id: flavor.slug,
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
        maxQtyPerCheckout: flavor.maxQtyPerCheckout,
        image: flavor.image,
        inStock: flavor.inStock,
        categoryId: flavor.categoryId || null,
        category: category
          ? { id: String(category._id), name: category.name, slug: category.slug }
          : null,
        labels: flavor.labels || [],
        trustBadges: flavor.trustBadges || [],
        highlights: flavor.highlights || [],
        nutrition: flavor.nutrition || {},
        productInfo: flavor.productInfo || {},
        delivery: flavor.delivery || {},
        rating: ratings.get(flavor.name.toLowerCase()) || EMPTY_RATING,
        likesCount: likes.get(flavor.slug) || likes.get(String(flavor._id)) || 0,
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
    const { name, tagline, description, heat, ingredients, gradient, accent, badge, bestSeller, packs, maxQtyPerCheckout, image, inStock } = req.body;

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const id = slug;

    // Check if flavor exists
    let existing = await Flavor.findOne({ slug });
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
      bestSeller,
      maxQtyPerCheckout: maxQtyPerCheckout !== undefined ? Number(maxQtyPerCheckout) : undefined,
      image,
      inStock: inStock !== undefined ? Boolean(inStock) : true
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
        id: flavor.slug,
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
    const mongoose = require('mongoose');

    let flavor = await Flavor.findOne({
      $or: [
        { slug: flavorId },
        ...(mongoose.Types.ObjectId.isValid(flavorId) ? [{ _id: flavorId }] : [])
      ]
    });
    if (!flavor) {
      return next(new ErrorResponse('Product not found', 404));
    }

    const { name, tagline, description, heat, ingredients, gradient, accent, badge, bestSeller, packs, maxQtyPerCheckout, image, inStock } = req.body;

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
    if (maxQtyPerCheckout !== undefined) {
      flavor.maxQtyPerCheckout = maxQtyPerCheckout === "" || maxQtyPerCheckout === null ? undefined : Number(maxQtyPerCheckout);
    }
    if (image !== undefined) {
      flavor.image = image === "" || image === null ? undefined : image;
    }
    if (inStock !== undefined) {
      flavor.inStock = Boolean(inStock);
    }

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
    const mongoose = require('mongoose');

    const flavor = await Flavor.findOne({
      $or: [
        { slug: flavorId },
        ...(mongoose.Types.ObjectId.isValid(flavorId) ? [{ _id: flavorId }] : [])
      ]
    });
    if (!flavor) {
      return next(new ErrorResponse('Product not found', 404));
    }

    const actualSlug = flavor.slug;
    await Flavor.findByIdAndDelete(flavor._id);
    await Product.findOneAndDelete({ flavorId: actualSlug });
    
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

// ─────────────────────────────────────────────────────────────────────────────
// BULK PRODUCT OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Bulk delete products by flavorId array
// @route   POST /api/v1/products/bulk/delete
// @access  Private (Admin)
exports.bulkDeleteProducts = async (req, res, next) => {
  try {
    const { flavorIds } = req.body;
    if (!Array.isArray(flavorIds) || flavorIds.length === 0) {
      return next(new ErrorResponse('flavorIds array is required', 400));
    }

    const Inventory = require('../models/Inventory');
    await Promise.all([
      Flavor.deleteMany({ id: { $in: flavorIds } }),
      Product.deleteMany({ flavorId: { $in: flavorIds } }),
      Inventory.deleteMany({ flavorId: { $in: flavorIds } })
    ]);

    await AuditLog.create({
      user: req.user?.username || 'Admin',
      role: req.user?.role || 'Admin',
      action: `Bulk deleted ${flavorIds.length} products: ${flavorIds.join(', ')}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, { success: true, message: `${flavorIds.length} products deleted successfully` });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk publish / unpublish products
// @route   POST /api/v1/products/bulk/status
// @access  Private (Admin)
exports.bulkUpdateProductStatus = async (req, res, next) => {
  try {
    const { flavorIds, status } = req.body;
    if (!Array.isArray(flavorIds) || flavorIds.length === 0) {
      return next(new ErrorResponse('flavorIds array is required', 400));
    }
    if (!['Active', 'Inactive'].includes(status)) {
      return next(new ErrorResponse("status must be 'Active' or 'Inactive'", 400));
    }

    await Flavor.updateMany({ id: { $in: flavorIds } }, { status });

    await AuditLog.create({
      user: req.user?.username || 'Admin',
      role: req.user?.role || 'Admin',
      action: `Bulk set ${flavorIds.length} products to ${status}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, { success: true, message: `${flavorIds.length} products set to ${status}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate a product (create copy with same details)
// @route   POST /api/v1/products/:id/duplicate
// @access  Private (Admin)
exports.duplicateProduct = async (req, res, next) => {
  try {
    const flavorId = req.params.id;
    const mongoose = require('mongoose');

    const srcFlavor = await Flavor.findOne({
      $or: [
        { slug: flavorId },
        ...(mongoose.Types.ObjectId.isValid(flavorId) ? [{ _id: flavorId }] : [])
      ]
    }).lean();
    if (!srcFlavor) return next(new ErrorResponse('Product not found', 404));

    const srcProduct = await Product.findOne({ flavorId: srcFlavor.slug }).lean();

    // Generate unique slug for the copy
    const baseName = `${srcFlavor.name} Copy`;
    const newSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    const newFlavor = await Flavor.create({
      ...srcFlavor,
      _id: undefined,
      name: baseName,
      slug: newSlug,
      status: 'Inactive' // copies start as drafts
    });

    if (srcProduct) {
      const Inventory = require('../models/Inventory');
      const newProduct = await Product.create({
        flavorId: newSlug,
        packs: srcProduct.packs.map(p => ({ ...p._doc || p, stock: 0, _id: undefined }))
      });

      // Seed inventory at 0 for new copy
      for (const p of newProduct.packs) {
        await Inventory.create({ flavorId: newSlug, packId: p.id, currentStock: 0 });
      }
    }

    await AuditLog.create({
      user: req.user?.username || 'Admin',
      role: req.user?.role || 'Admin',
      action: `Duplicated product ${flavorId} → ${newSlug}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 201, { success: true, message: 'Product duplicated successfully', data: { id: newSlug, name: baseName } });
  } catch (error) {
    next(error);
  }
};
