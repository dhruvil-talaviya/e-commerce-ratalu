const Category = require('../models/Category');
const Combo = require('../models/Combo');
const Flavor = require('../models/Flavor');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

const actor = (req) => req.user?.username || req.user?.name || 'Admin';

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const audit = (req, action) =>
  AuditLog.create({
    user: actor(req),
    role: req.user?.role || 'Admin',
    action,
    ipAddress: req.ip || '127.0.0.1'
  }).catch(() => {});

/* ================================================================== */
/* CATEGORIES                                                         */
/* ================================================================== */

// @desc    Categories for the storefront filter bar, with live product counts
// @route   GET /api/v1/categories
// @access  Public
exports.getPublicCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ status: 'Active', visibility: true })
      .sort({ sorting: 1, name: 1 })
      .lean();

    /**
     * Count in one grouped query rather than one per category. The count is what
     * lets the storefront hide a filter that would return nothing — a chip that
     * leads to an empty page is worse than no chip.
     */
    const counts = await Flavor.aggregate([
      { $match: { status: 'Active', categoryId: { $ne: null } } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } }
    ]);
    const countById = new Map(counts.map((c) => [String(c._id), c.count]));

    const uncategorised = await Flavor.countDocuments({
      status: 'Active',
      $or: [{ categoryId: null }, { categoryId: { $exists: false } }]
    });

    sendResponse(res, 200, {
      success: true,
      data: categories.map((c) => ({
        id: String(c._id),
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        image: c.image || '',
        productCount: countById.get(String(c._id)) || 0
      })),
      meta: { uncategorised }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    All categories, including hidden ones
// @route   GET /api/v1/admin/categories
// @access  Private (Admin)
exports.getAdminCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ sorting: 1, name: 1 }).lean();

    const counts = await Flavor.aggregate([
      { $match: { categoryId: { $ne: null } } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } }
    ]);
    const countById = new Map(counts.map((c) => [String(c._id), c.count]));

    sendResponse(res, 200, {
      success: true,
      data: categories.map((c) => ({ ...c, productCount: countById.get(String(c._id)) || 0 }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a category
// @route   POST /api/v1/admin/categories
// @access  Private (Admin)
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, image, sorting, status, visibility } = req.body;

    if (!name || !String(name).trim()) {
      return next(new ErrorResponse('A category needs a name.', 400));
    }

    const slug = slugify(req.body.slug || name);

    if (await Category.findOne({ slug })) {
      return next(new ErrorResponse(`A category with the slug "${slug}" already exists.`, 400));
    }

    const category = await Category.create({
      name: String(name).trim(),
      slug,
      description: description || '',
      image: image || '',
      sorting: Number(sorting) || 0,
      status: status || 'Active',
      visibility: visibility !== false
    });

    await audit(req, `Created category "${category.name}"`);

    sendResponse(res, 201, { success: true, message: 'Category created', data: category });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a category
// @route   PUT /api/v1/admin/categories/:id
// @access  Private (Admin)
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return next(new ErrorResponse('Category not found', 404));

    const { name, description, image, sorting, status, visibility } = req.body;

    if (name !== undefined) category.name = String(name).trim();
    if (req.body.slug !== undefined) {
      const slug = slugify(req.body.slug);
      const clash = await Category.findOne({ slug, _id: { $ne: category._id } });
      if (clash) return next(new ErrorResponse(`The slug "${slug}" is already in use.`, 400));
      category.slug = slug;
    }
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (sorting !== undefined) category.sorting = Number(sorting) || 0;
    if (status !== undefined) category.status = status;
    if (visibility !== undefined) category.visibility = Boolean(visibility);

    await category.save();
    await audit(req, `Updated category "${category.name}"`);

    sendResponse(res, 200, { success: true, message: 'Category updated', data: category });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a category
// @route   DELETE /api/v1/admin/categories/:id
// @access  Private (Admin)
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return next(new ErrorResponse('Category not found', 404));

    /**
     * Don't orphan products silently. Unassign them explicitly so they fall back
     * to the full catalogue rather than pointing at a category that no longer
     * exists — a dangling reference that would make them vanish from every
     * filtered view.
     */
    const affected = await Flavor.updateMany(
      { categoryId: category._id },
      { $set: { categoryId: null } }
    );

    await Combo.updateMany({ categoryId: category._id }, { $set: { categoryId: null } });

    await category.deleteOne();
    await audit(req, `Deleted category "${category.name}" (${affected.modifiedCount} product(s) uncategorised)`);

    sendResponse(res, 200, {
      success: true,
      message:
        affected.modifiedCount > 0
          ? `Category deleted. ${affected.modifiedCount} product(s) are now uncategorised.`
          : 'Category deleted.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/* ================================================================== */
/* COMBOS                                                             */
/* ================================================================== */

/** Price the named packs at their CURRENT catalogue prices. */
const priceItems = async (items) => {
  let originalPrice = 0;
  const resolved = [];

  for (const item of items) {
    const flavor = await Flavor.findOne({ slug: item.flavorId });
    const product = await Product.findOne({ flavorId: item.flavorId });
    const pack = product?.packs?.find((p) => p.id === item.packId);

    if (!flavor || !pack) {
      throw new ErrorResponse(
        `"${item.flavorId} / ${item.packId}" is not a product we sell.`,
        400
      );
    }

    const quantity = Math.max(parseInt(item.quantity, 10) || 1, 1);
    originalPrice += pack.price * quantity;

    resolved.push({
      flavorId: flavor.slug,
      flavorName: flavor.name,
      packId: pack.id,
      packLabel: pack.label,
      quantity
    });
  }

  return { resolved, originalPrice };
};

// @desc    Live combos for the storefront
// @route   GET /api/v1/combos
// @access  Public
exports.getPublicCombos = async (req, res, next) => {
  try {
    const now = new Date();

    const combos = await Combo.find({
      status: 'Active',
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }
      ]
    }).sort({ sortOrder: 1, createdAt: -1 });

    /**
     * Re-price each bundle against the live catalogue before showing it.
     *
     * `originalPrice` is a snapshot from when the combo was saved, so once a
     * pack price moved the card advertised a "was" price and a saving that no
     * longer matched what checkout actually charges. Checkout discounts down to
     * `comboPrice` using live prices, so the card must quote live prices too —
     * otherwise the two disagree and the customer is quoted a saving they
     * don't get.
     */
    const priced = await Promise.all(
      combos.map(async (combo) => {
        const json = combo.toJSON();
        try {
          const { originalPrice } = await priceItems(combo.items);
          json.originalPrice = originalPrice;
          json.savings = Math.max(originalPrice - combo.comboPrice, 0);
          json.discountPercent = originalPrice
            ? Math.round(((originalPrice - combo.comboPrice) / originalPrice) * 100)
            : 0;
        } catch {
          // A pack was pulled from the catalogue — fall back to the snapshot
          // rather than dropping the combo entirely.
        }
        return json;
      })
    );

    sendResponse(res, 200, { success: true, data: priced });
  } catch (error) {
    next(error);
  }
};

// @desc    All combos
// @route   GET /api/v1/admin/combos
// @access  Private (Admin)
exports.getAdminCombos = async (req, res, next) => {
  try {
    const combos = await Combo.find().sort({ sortOrder: 1, createdAt: -1 });
    sendResponse(res, 200, { success: true, data: combos });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a combo
// @route   POST /api/v1/admin/combos
// @access  Private (Admin)
exports.createCombo = async (req, res, next) => {
  try {
    const { name, description, items, comboPrice, badge, categoryId, status, featured, startsAt, endsAt } = req.body;

    if (!name || !String(name).trim()) {
      return next(new ErrorResponse('A combo needs a name.', 400));
    }
    if (!Array.isArray(items) || items.length < 2) {
      return next(new ErrorResponse('A combo needs at least two items.', 400));
    }

    const { resolved, originalPrice } = await priceItems(items);

    const price = Math.max(Math.round(Number(comboPrice) || 0), 0);

    // A "bundle" that costs more than buying the items separately is not a
    // bundle. Refuse rather than publish an offer that misleads.
    if (price >= originalPrice) {
      return next(new ErrorResponse(
        `The combo price (₹${price}) must be less than buying the items separately (₹${originalPrice}).`,
        400
      ));
    }

    const slug = slugify(req.body.slug || name);
    if (await Combo.findOne({ slug })) {
      return next(new ErrorResponse(`A combo with the slug "${slug}" already exists.`, 400));
    }

    const combo = await Combo.create({
      name: String(name).trim(),
      slug,
      description: description || '',
      image: req.body.image || '',
      items: resolved,
      comboPrice: price,
      originalPrice,
      categoryId: categoryId || null,
      badge: badge || '',
      featured: Boolean(featured),
      status: status || 'Active',
      startsAt: startsAt || null,
      endsAt: endsAt || null
    });

    await audit(req, `Created combo "${combo.name}" (₹${price}, saves ₹${originalPrice - price})`);

    sendResponse(res, 201, { success: true, message: 'Combo created', data: combo });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a combo
// @route   PUT /api/v1/admin/combos/:id
// @access  Private (Admin)
exports.updateCombo = async (req, res, next) => {
  try {
    const combo = await Combo.findById(req.params.id);
    if (!combo) return next(new ErrorResponse('Combo not found', 404));

    if (Array.isArray(req.body.items)) {
      if (req.body.items.length < 2) {
        return next(new ErrorResponse('A combo needs at least two items.', 400));
      }
      const { resolved, originalPrice } = await priceItems(req.body.items);
      combo.items = resolved;
      combo.originalPrice = originalPrice;
    }

    if (req.body.comboPrice !== undefined) {
      combo.comboPrice = Math.max(Math.round(Number(req.body.comboPrice) || 0), 0);
    }

    if (combo.comboPrice >= combo.originalPrice) {
      return next(new ErrorResponse(
        `The combo price (₹${combo.comboPrice}) must be less than buying the items separately (₹${combo.originalPrice}).`,
        400
      ));
    }

    ['name', 'description', 'image', 'badge', 'status'].forEach((f) => {
      if (req.body[f] !== undefined) combo[f] = req.body[f];
    });
    if (req.body.categoryId !== undefined) combo.categoryId = req.body.categoryId || null;
    if (req.body.featured !== undefined) combo.featured = Boolean(req.body.featured);
    if (req.body.sortOrder !== undefined) combo.sortOrder = Number(req.body.sortOrder) || 0;
    if (req.body.startsAt !== undefined) combo.startsAt = req.body.startsAt || null;
    if (req.body.endsAt !== undefined) combo.endsAt = req.body.endsAt || null;

    await combo.save();
    await audit(req, `Updated combo "${combo.name}"`);

    sendResponse(res, 200, { success: true, message: 'Combo updated', data: combo });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a combo
// @route   DELETE /api/v1/admin/combos/:id
// @access  Private (Admin)
exports.deleteCombo = async (req, res, next) => {
  try {
    const combo = await Combo.findByIdAndDelete(req.params.id);
    if (!combo) return next(new ErrorResponse('Combo not found', 404));

    await audit(req, `Deleted combo "${combo.name}"`);

    sendResponse(res, 200, { success: true, message: 'Combo deleted', data: null });
  } catch (error) {
    next(error);
  }
};
