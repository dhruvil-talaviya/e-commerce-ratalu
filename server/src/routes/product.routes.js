const express = require('express');
const { getPublicStats } = require('../controllers/stats.controller');
const { track } = require('../controllers/analytics.controller');
const router = express.Router();

// Real, countable facts about the store — see stats.controller.js.
router.get('/stats', getPublicStats);
// Privacy-light page-view tracking for the admin Reach dashboard.
router.post('/track', track);
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  deleteCategory,
  getFaqs,
  getReviews,
  createReview,
  duplicateProduct
} = require('../controllers/product.controller');

const {
  getAdminProducts,
  saveDraft,
  previewProduct,
  publishProduct,
  revertDraft,
  getVersions,
  restoreVersion
} = require('../controllers/product-draft.controller');

const { protect, authorize } = require('../middlewares/auth');

const adminOnly = [protect, authorize('Admin', 'Super Admin', 'Manager')];

// ─── Admin: draft → preview → publish ────────────────────────────────────────
// Declared before the public '/products/:slugOrId' so "admin" isn't swallowed
// as a product slug.
router.get('/admin/products', ...adminOnly, getAdminProducts);
router.put('/admin/products/:idOrSlug/draft', ...adminOnly, saveDraft);
router.get('/admin/products/:idOrSlug/preview', ...adminOnly, previewProduct);
router.post('/admin/products/:idOrSlug/publish', ...adminOnly, publishProduct);
router.post('/admin/products/:idOrSlug/revert', ...adminOnly, revertDraft);
router.get('/admin/products/:idOrSlug/versions', ...adminOnly, getVersions);
router.post('/admin/products/:idOrSlug/restore/:versionId', ...adminOnly, restoreVersion);

// Public catalog lookups
router.get('/products', getProducts);
router.get('/products/:slugOrId', getProduct);
router.get('/categories', getCategories);
router.get('/faqs', getFaqs);
router.get('/reviews', getReviews);
router.post('/reviews', createReview);

// Private Admin gates
router.post('/products', protect, authorize('Admin', 'Super Admin'), createProduct);
router.put('/products/:id', protect, authorize('Admin', 'Super Admin'), updateProduct);
router.delete('/products/:id', protect, authorize('Admin', 'Super Admin'), deleteProduct);
router.post('/products/:id/duplicate', protect, authorize('Admin', 'Super Admin'), duplicateProduct);

router.post('/categories', protect, authorize('Admin', 'Super Admin'), createCategory);
router.delete('/categories/:id', protect, authorize('Admin', 'Super Admin'), deleteCategory);

module.exports = router;
