const PageSection = require('../models/PageSection');
const ContentVersion = require('../models/ContentVersion');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

/** Who performed the action, for the audit trail. */
const actor = (req) => req.user?.username || req.user?.name || 'Admin';

/**
 * Publishing, restoring and deleting change what the public sees, so they are
 * reserved for the owner. Editing a draft is safe for anyone with admin access.
 */
const requireSuperAdmin = (req) => req.user?.role === 'Super Admin';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — what the storefront renders
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Live, published sections for a page, in display order
// @route   GET /api/v1/content/:page
// @access  Public
exports.getPublicPage = async (req, res, next) => {
  try {
    const now = new Date();

    const sections = await PageSection.find({
      page: req.params.page,
      enabled: true,
      published: { $ne: null },
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expireAt: null }, { expireAt: { $gte: now } }] }
      ]
    })
      .sort({ sortOrder: 1 })
      .select('key type sortOrder published')
      .lean();

    // Flatten to `key -> content` so the storefront reads cms.hero, cms.footer…
    const content = {};
    sections.forEach((s) => {
      content[s.key] = s.published;
    });

    sendResponse(res, 200, {
      success: true,
      data: {
        page: req.params.page,
        sections: sections.map((s) => ({ key: s.key, type: s.type, sortOrder: s.sortOrder })),
        content
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — the Website Builder
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Every section of a page, draft included
// @route   GET /api/v1/admin/content/:page
// @access  Private (Admin)
exports.getAdminPage = async (req, res, next) => {
  try {
    const sections = await PageSection.find({ page: req.params.page })
      .sort({ sortOrder: 1 })
      .lean();

    sendResponse(res, 200, { success: true, data: sections });
  } catch (error) {
    next(error);
  }
};

// @desc    One section, with its version count
// @route   GET /api/v1/admin/content/:page/:key
// @access  Private (Admin)
exports.getAdminSection = async (req, res, next) => {
  try {
    const { page, key } = req.params;
    let section = await PageSection.findOne({ page, key });
    if (!section) {
      section = await PageSection.create({
        page,
        key,
        label: `${page.charAt(0).toUpperCase() + page.slice(1)} Details`,
        type: 'custom',
        draft: {},
        published: {},
        enabled: true
      });
    }

    const versions = await ContentVersion.countDocuments({ page, key });

    sendResponse(res, 200, { success: true, data: { ...section.toObject(), versions } });
  } catch (error) {
    next(error);
  }
};

// @desc    Save the working copy. Never touches the live site.
// @route   PUT /api/v1/admin/content/:page/:key/draft
// @access  Private (Admin)
exports.saveDraft = async (req, res, next) => {
  try {
    const { page, key } = req.params;
    const { content, enabled, publishAt, expireAt } = req.body;

    let section = await PageSection.findOne({ page, key });
    if (!section) {
      section = new PageSection({
        page,
        key,
        label: `${page.charAt(0).toUpperCase() + page.slice(1)} Details`,
        type: 'custom',
        draft: {},
        published: {},
        enabled: true
      });
    }

    if (content !== undefined) section.draft = content;
    if (enabled !== undefined) section.enabled = Boolean(enabled);
    if (publishAt !== undefined) section.publishAt = publishAt || null;
    if (expireAt !== undefined) section.expireAt = expireAt || null;

    section.hasUnpublishedChanges =
      JSON.stringify(section.draft ?? null) !== JSON.stringify(section.published ?? null);
    section.updatedBy = actor(req);

    await section.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Draft saved',
      data: section
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Push the draft live and snapshot it into history
// @route   POST /api/v1/admin/content/:page/:key/publish
// @access  Private (Super Admin)
exports.publishSection = async (req, res, next) => {
  try {
    if (!requireSuperAdmin(req)) {
      return next(new ErrorResponse('Only a Super Admin can publish to the live site', 403));
    }

    const { page, key } = req.params;
    const section = await PageSection.findOne({ page, key });
    if (!section) return next(new ErrorResponse('Section not found', 404));

    if (section.draft === null || section.draft === undefined) {
      return next(new ErrorResponse('There is no draft to publish', 400));
    }

    section.published = section.draft;
    section.hasUnpublishedChanges = false;
    section.publishedAt = new Date();
    section.publishedBy = actor(req);
    await section.save();

    // Snapshot AFTER the publish succeeds, so history only records what went live.
    const last = await ContentVersion.findOne({ page, key }).sort({ version: -1 }).select('version');
    await ContentVersion.create({
      page,
      key,
      version: (last?.version || 0) + 1,
      content: section.published,
      action: 'publish',
      note: req.body?.note || '',
      createdBy: actor(req)
    });

    await AuditLog.create({
      user: actor(req),
      role: req.user.role,
      action: `Published website section "${key}" on ${page}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Section published to the live site',
      data: section
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Throw away the draft and go back to what's live
// @route   POST /api/v1/admin/content/:page/:key/revert
// @access  Private (Admin)
exports.revertDraft = async (req, res, next) => {
  try {
    const { page, key } = req.params;
    const section = await PageSection.findOne({ page, key });
    if (!section) return next(new ErrorResponse('Section not found', 404));

    section.draft = section.published;
    section.hasUnpublishedChanges = false;
    section.updatedBy = actor(req);
    await section.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Draft discarded — back to the live version',
      data: section
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Version history for a section
// @route   GET /api/v1/admin/content/:page/:key/versions
// @access  Private (Admin)
exports.getVersions = async (req, res, next) => {
  try {
    const { page, key } = req.params;
    const versions = await ContentVersion.find({ page, key })
      .sort({ version: -1 })
      .limit(50)
      .lean();

    sendResponse(res, 200, { success: true, data: versions });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore an old version — as a DRAFT, so it still needs publishing
// @route   POST /api/v1/admin/content/:page/:key/restore/:versionId
// @access  Private (Super Admin)
exports.restoreVersion = async (req, res, next) => {
  try {
    if (!requireSuperAdmin(req)) {
      return next(new ErrorResponse('Only a Super Admin can restore a version', 403));
    }

    const { page, key, versionId } = req.params;

    const snapshot = await ContentVersion.findOne({ _id: versionId, page, key });
    if (!snapshot) return next(new ErrorResponse('Version not found', 404));

    const section = await PageSection.findOne({ page, key });
    if (!section) return next(new ErrorResponse('Section not found', 404));

    /**
     * Restore into the draft, not straight to live. The admin still reviews and
     * publishes it, so an accidental restore never changes the public site, and
     * the restore itself is undoable via "discard draft".
     */
    section.draft = snapshot.content;
    section.hasUnpublishedChanges =
      JSON.stringify(section.draft ?? null) !== JSON.stringify(section.published ?? null);
    section.updatedBy = actor(req);
    await section.save();

    await AuditLog.create({
      user: actor(req),
      role: req.user.role,
      action: `Restored "${key}" on ${page} from v${snapshot.version} (into draft)`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: `Restored v${snapshot.version} into the draft — review it, then publish.`,
      data: section
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder / show / hide sections on a page
// @route   PUT /api/v1/admin/content/:page/reorder
// @access  Private (Admin)
exports.reorderSections = async (req, res, next) => {
  try {
    const { page } = req.params;
    const { sections } = req.body; // [{ key, sortOrder, enabled }]

    if (!Array.isArray(sections)) {
      return next(new ErrorResponse('`sections` must be an array', 400));
    }

    await Promise.all(
      sections.map((s) =>
        PageSection.updateOne(
          { page, key: s.key },
          {
            $set: {
              ...(s.sortOrder !== undefined ? { sortOrder: s.sortOrder } : {}),
              ...(s.enabled !== undefined ? { enabled: Boolean(s.enabled) } : {}),
              updatedBy: actor(req)
            }
          }
        )
      )
    );

    const updated = await PageSection.find({ page }).sort({ sortOrder: 1 }).lean();

    sendResponse(res, 200, {
      success: true,
      message: 'Layout updated',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};
