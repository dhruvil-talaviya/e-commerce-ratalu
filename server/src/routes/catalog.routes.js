const express = require('express');
const router = express.Router();
const {
  getPublicCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getPublicCombos,
  getAdminCombos,
  createCombo,
  updateCombo,
  deleteCombo
} = require('../controllers/catalog.controller');

const { protect, authorize } = require('../middlewares/auth');

const adminOnly = [protect, authorize('Admin', 'Super Admin', 'Manager')];

// ─── Public ──────────────────────────────────────────────────────────────────
// NOTE: these are mounted at the router root (NOT under /admin), so the paths
// are exactly /api/v1/categories and /api/v1/combos. Declaring them with an
// '/admin' prefix inside a router already mounted at '/admin' is what produced
// the /admin/admin/... dead routes elsewhere in this codebase.
router.get('/categories/list', getPublicCategories);
router.get('/combos', getPublicCombos);

// ─── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/categories', ...adminOnly, getAdminCategories);
router.post('/admin/categories', ...adminOnly, createCategory);
router.put('/admin/categories/:id', ...adminOnly, updateCategory);
router.delete('/admin/categories/:id', ...adminOnly, deleteCategory);

router.get('/admin/combos', ...adminOnly, getAdminCombos);
router.post('/admin/combos', ...adminOnly, createCombo);
router.put('/admin/combos/:id', ...adminOnly, updateCombo);
router.delete('/admin/combos/:id', ...adminOnly, deleteCombo);

module.exports = router;
