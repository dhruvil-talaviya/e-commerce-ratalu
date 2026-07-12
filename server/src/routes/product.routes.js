const express = require('express');
const router = express.Router();
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
  createReview
} = require('../controllers/product.controller');

const { protect, authorize } = require('../middlewares/auth');

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

router.post('/categories', protect, authorize('Admin', 'Super Admin'), createCategory);
router.delete('/categories/:id', protect, authorize('Admin', 'Super Admin'), deleteCategory);

module.exports = router;
