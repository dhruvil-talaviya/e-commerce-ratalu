const express = require('express');
const router = express.Router();
const {
  getPublicPage,
  getAdminPage,
  getAdminSection,
  saveDraft,
  publishSection,
  revertDraft,
  getVersions,
  restoreVersion,
  reorderSections
} = require('../controllers/content.controller');

const { protect, authorize } = require('../middlewares/auth');

const adminOnly = [protect, authorize('Admin', 'Super Admin', 'Manager')];

// ─── Public: what the storefront renders ─────────────────────────────────────
router.get('/content/:page', getPublicPage);

// ─── Admin: the Website Builder ──────────────────────────────────────────────
// `reorder` is declared before '/:key' so it isn't captured as a section key.
router.put('/admin/content/:page/reorder', ...adminOnly, reorderSections);

router.get('/admin/content/:page', ...adminOnly, getAdminPage);
router.get('/admin/content/:page/:key', ...adminOnly, getAdminSection);
router.put('/admin/content/:page/:key/draft', ...adminOnly, saveDraft);
router.post('/admin/content/:page/:key/publish', ...adminOnly, publishSection);
router.post('/admin/content/:page/:key/revert', ...adminOnly, revertDraft);
router.get('/admin/content/:page/:key/versions', ...adminOnly, getVersions);
router.post('/admin/content/:page/:key/restore/:versionId', ...adminOnly, restoreVersion);

module.exports = router;
