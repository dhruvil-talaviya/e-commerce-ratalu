const express = require('express');
const router = express.Router();
const {
  getPublicCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getPublicCombos,
  getFeaturedCombos,
  getComboBySlug,
  getAdminCombos,
  createCombo,
  updateCombo,
  deleteCombo,
  patchComboStatus
} = require('../controllers/catalog.controller');

const { protect, authorize } = require('../middlewares/auth');

const adminOnly = [protect, authorize('Admin', 'Super Admin', 'Manager')];

// ─── Public ──────────────────────────────────────────────────────────────────
router.get('/categories/list', getPublicCategories);
router.get('/combos', getPublicCombos);
router.get('/combos/featured', getFeaturedCombos);
router.get('/combos/:slug', getComboBySlug);

// ─── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/categories', ...adminOnly, getAdminCategories);
router.post('/admin/categories', ...adminOnly, createCategory);
router.put('/admin/categories/:id', ...adminOnly, updateCategory);
router.delete('/admin/categories/:id', ...adminOnly, deleteCategory);

router.get('/admin/combos', ...adminOnly, getAdminCombos);
router.post('/admin/combos', ...adminOnly, createCombo);
router.put('/admin/combos/:id', ...adminOnly, updateCombo);
router.delete('/admin/combos/:id', ...adminOnly, deleteCombo);
router.patch('/admin/combos/:id/status', ...adminOnly, patchComboStatus);

module.exports = router;
