const Flavor = require('../models/Flavor');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const StockHistory = require('../models/StockHistory');
const ContentVersion = require('../models/ContentVersion');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

/**
 * Draft → Preview → Publish for products.
 *
 * Mirrors the Website Builder exactly: the admin edits a draft, previews it on
 * the real storefront, then publishes. Nothing they type reaches a customer
 * until they say so. History is written to the same `ContentVersion` collection
 * the CMS uses (page: 'product', key: slug) rather than a parallel one — one
 * versioning engine, one restore path, one thing to reason about.
 */

const actor = (req) => req.user?.username || req.user?.name || 'Admin';

/**
 * Normalise one pack size (a weight and its price).
 *
 * Prices are coerced to whole rupees and clamped at zero — a negative price
 * would sail straight through to checkout and produce a negative order total.
 * `compareAt` is the strike-through "was" price; it's dropped unless it is
 * genuinely higher than the real price, so the UI can never show a fake saving.
 */
const normalisePack = (pack) => {
  const price = Math.max(Math.round(Number(pack.price) || 0), 0);
  const compareAt = Math.round(Number(pack.compareAt) || 0);

  return {
    id: String(pack.id || '').trim(),
    label: String(pack.label || pack.id || '').trim(),
    grams: Math.max(Math.round(Number(pack.grams) || 0), 0),
    price,
    compareAt: compareAt > price ? compareAt : undefined,
    stock: Math.max(Math.round(Number(pack.stock) || 0), 0),
    note: String(pack.note || '').trim(),
    sku: String(pack.sku || '').trim() || undefined,
    barcode: String(pack.barcode || '').trim() || undefined
  };
};

/** Only ever accept the fields a product is allowed to have. */
const pickEditable = (body) => {
  const out = {};
  Flavor.EDITABLE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) out[field] = body[field];
  });

  /**
   * Pack pricing lives on the Product document, not Flavor — but the admin edits
   * it in the same form, so it rides along inside the draft and is written out
   * at publish time. Keeping it in the draft is what makes "preview the new
   * prices before customers see them" possible at all.
   */
  if (Array.isArray(body.packs)) {
    out.packs = body.packs
      .map(normalisePack)
      .filter((p) => p.id && p.price >= 0);
  }

  return out;
};

/**
 * Write the published packs to the catalogue AND the inventory.
 *
 * Stock is duplicated: `Product.packs.stock` is what checkout validates against,
 * and `Inventory.currentStock` is what the warehouse and refunds move. If the
 * product editor wrote only one of them they would drift apart, and checkout
 * would start refusing orders for stock the inventory says exists. So both are
 * written here, and any manual change is recorded in StockHistory so the
 * adjustment is auditable rather than a mystery.
 */
const applyPacks = async (flavorId, packs, by) => {
  const product = await Product.findOne({ flavorId });
  if (!product) return;

  const previous = new Map((product.packs || []).map((p) => [p.id, p]));

  product.packs = packs;
  await product.save();

  for (const pack of packs) {
    const before = previous.get(pack.id);

    const inv = await Inventory.findOne({ flavorId, packId: pack.id });

    if (!inv) {
      // A brand-new pack size needs an inventory row, or stock movements for it
      // would silently go nowhere.
      await Inventory.create({
        flavorId,
        packId: pack.id,
        currentStock: pack.stock,
        costPrice: 0
      });
    } else if (inv.currentStock !== pack.stock) {
      const delta = pack.stock - inv.currentStock;
      inv.currentStock = pack.stock;
      inv.lastRestockedAt = new Date();
      inv.lastRestockedBy = by;
      await inv.save();

      await StockHistory.create({
        flavorId,
        packId: pack.id,
        type: delta > 0 ? 'In' : 'Out',
        quantity: Math.abs(delta),
        referenceId: `manual:${by}`,
        note: `Manual stock adjustment from the product editor (${before?.stock ?? '—'} → ${pack.stock}).`
      });
    }
  }
};

const findFlavor = async (idOrSlug) => {
  const flavor = await Flavor.findOne({
    $or: [{ slug: idOrSlug }, ...(idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: idOrSlug }] : [])]
  });
  if (!flavor) throw new ErrorResponse('Product not found', 404);
  return flavor;
};

/** Does the draft actually differ from what's live? */
const draftDiffers = (flavor, draft) => {
  if (!draft) return false;
  return Object.keys(draft).some(
    (k) => JSON.stringify(draft[k]) !== JSON.stringify(flavor.get(k))
  );
};

// ─────────────────────────────────────────────────────────────────────────────

// @desc    Admin list — live values plus draft state
// @route   GET /api/v1/admin/products
// @access  Private (Admin)
exports.getAdminProducts = async (req, res, next) => {
  try {
    const { search } = req.query;

    const filter = {};
    if (search) {
      const rx = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      filter.$or = [{ name: rx }, { slug: rx }, { tagline: rx }];
    }

    const flavors = await Flavor.find(filter).sort({ createdAt: -1 }).lean();

    // Attach the pack/price/stock summary, which lives on Product.
    const products = await Product.find().lean();
    const packsBySlug = new Map(products.map((p) => [p.flavorId, p.packs || []]));

    const data = flavors.map((f) => {
      const packs = packsBySlug.get(f.slug) || [];
      return {
        ...f,
        packs,
        packCount: packs.length,
        priceFrom: packs.length ? Math.min(...packs.map((p) => p.price)) : null,
        totalStock: packs.reduce((s, p) => s + (p.stock || 0), 0)
      };
    });

    sendResponse(res, 200, { success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Save the working copy. Never touches the live storefront.
// @route   PUT /api/v1/admin/products/:idOrSlug/draft
// @access  Private (Admin)
exports.saveDraft = async (req, res, next) => {
  try {
    const flavor = await findFlavor(req.params.idOrSlug);

    const incoming = pickEditable(req.body);
    const merged = { ...(flavor.draft || {}), ...incoming };

    flavor.draft = merged;
    flavor.hasUnpublishedChanges = draftDiffers(flavor, merged);
    flavor.updatedBy = actor(req);
    await flavor.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Draft saved. Preview it, then publish when you\'re happy.',
      data: flavor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    The product exactly as the customer WOULD see it (draft applied)
// @route   GET /api/v1/admin/products/:idOrSlug/preview
// @access  Private (Admin)
exports.previewProduct = async (req, res, next) => {
  try {
    const flavor = await findFlavor(req.params.idOrSlug);
    const preview = flavor.withDraft();

    const product = await Product.findOne({ flavorId: flavor.slug }).lean();

    // Draft prices win, so the preview shows the pricing the admin is about to
    // publish — not the pricing customers currently pay.
    const packs = flavor.draft?.packs?.length ? flavor.draft.packs : (product?.packs || []);

    sendResponse(res, 200, {
      success: true,
      data: {
        // `id` is what the storefront keys products on.
        ...preview,
        id: preview.slug,
        packs,
        hasUnpublishedChanges: flavor.hasUnpublishedChanges
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Push the draft live and snapshot it
// @route   POST /api/v1/admin/products/:idOrSlug/publish
// @access  Private (Super Admin)
exports.publishProduct = async (req, res, next) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return next(new ErrorResponse('Only a Super Admin can publish to the live site.', 403));
    }

    const flavor = await findFlavor(req.params.idOrSlug);

    if (!flavor.draft || !flavor.hasUnpublishedChanges) {
      return next(new ErrorResponse('There are no unpublished changes to publish.', 400));
    }

    // Snapshot what is CURRENTLY live first, so publishing is undoable.
    const last = await ContentVersion.findOne({ page: 'product', key: flavor.slug })
      .sort({ version: -1 })
      .select('version');

    const liveNow = {};
    Flavor.EDITABLE_FIELDS.forEach((f) => { liveNow[f] = flavor.get(f); });

    // Snapshot the pricing too, so restoring a version brings the old prices
    // back — not just the copy.
    const livePacks = await Product.findOne({ flavorId: flavor.slug }).select('packs').lean();
    liveNow.packs = livePacks?.packs || [];

    await ContentVersion.create({
      page: 'product',
      key: flavor.slug,
      version: (last?.version || 0) + 1,
      content: liveNow,
      action: 'publish',
      note: req.body?.note || '',
      createdBy: actor(req)
    });

    const draftPacks = flavor.draft.packs;

    // Apply the draft to the live fields.
    Object.entries(flavor.draft).forEach(([field, value]) => {
      if (Flavor.EDITABLE_FIELDS.includes(field)) flavor.set(field, value);
    });

    flavor.draft = null;
    flavor.hasUnpublishedChanges = false;
    flavor.publishedAt = new Date();
    flavor.publishedBy = actor(req);
    await flavor.save();

    // ── Pack pricing / stock ────────────────────────────────────────────────
    if (Array.isArray(draftPacks) && draftPacks.length) {
      await applyPacks(flavor.slug, draftPacks, actor(req));
    }

    await AuditLog.create({
      user: actor(req),
      role: req.user.role,
      action: `Published product "${flavor.name}" (${flavor.slug})`,
      ipAddress: req.ip || '127.0.0.1'
    });

    /**
     * Publishing pushes the draft live. It does NOT make a hidden product
     * visible — `status` is a separate switch.
     *
     * Saying "is live on the storefront" regardless was a lie: an Inactive
     * product is filtered out of the public catalogue entirely, so an admin
     * could publish, be congratulated, and still find nothing on the shop page.
     * If the product can't actually be seen, say so and say why.
     */
    const visible = flavor.status === 'Active';

    sendResponse(res, 200, {
      success: true,
      message: visible
        ? `"${flavor.name}" is live on the storefront.`
        : `"${flavor.name}" is saved, but customers still can't see it — it's set to Inactive.`,
      data: { ...flavor.toObject(), visible }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Throw the draft away and go back to what's live
// @route   POST /api/v1/admin/products/:idOrSlug/revert
// @access  Private (Admin)
exports.revertDraft = async (req, res, next) => {
  try {
    const flavor = await findFlavor(req.params.idOrSlug);

    flavor.draft = null;
    flavor.hasUnpublishedChanges = false;
    flavor.updatedBy = actor(req);
    await flavor.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Draft discarded — back to what customers see.',
      data: flavor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Version history for a product
// @route   GET /api/v1/admin/products/:idOrSlug/versions
// @access  Private (Admin)
exports.getVersions = async (req, res, next) => {
  try {
    const flavor = await findFlavor(req.params.idOrSlug);

    const versions = await ContentVersion.find({ page: 'product', key: flavor.slug })
      .sort({ version: -1 })
      .limit(50)
      .lean();

    sendResponse(res, 200, { success: true, data: versions });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore an old version — into the DRAFT, never straight to live
// @route   POST /api/v1/admin/products/:idOrSlug/restore/:versionId
// @access  Private (Super Admin)
exports.restoreVersion = async (req, res, next) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return next(new ErrorResponse('Only a Super Admin can restore a version.', 403));
    }

    const flavor = await findFlavor(req.params.idOrSlug);

    const snapshot = await ContentVersion.findOne({
      _id: req.params.versionId,
      page: 'product',
      key: flavor.slug
    });
    if (!snapshot) return next(new ErrorResponse('Version not found', 404));

    /**
     * Into the draft, so the admin still previews and publishes it. An
     * accidental restore therefore never changes the live storefront, and the
     * restore itself is undoable via "discard draft".
     */
    flavor.draft = pickEditable(snapshot.content);
    flavor.hasUnpublishedChanges = draftDiffers(flavor, flavor.draft);
    flavor.updatedBy = actor(req);
    await flavor.save();

    await AuditLog.create({
      user: actor(req),
      role: req.user.role,
      action: `Restored product "${flavor.slug}" from v${snapshot.version} into draft`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: `Restored v${snapshot.version} into the draft — preview it, then publish.`,
      data: flavor
    });
  } catch (error) {
    next(error);
  }
};
