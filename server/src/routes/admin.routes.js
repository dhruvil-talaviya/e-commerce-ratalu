const express = require('express');
const router = express.Router();

const {
  adminLoginOtp,
  adminLogin,
  getSettings,
  updateSettings,
  getAuditLogs,
  getOffers,
  createOffer,
  deleteOffer,
  // Banners (CMS)
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  // Homepage Sections (CMS)
  getHomepageSections,
  updateHomepageSection,
  reorderHomepageSections,
  // FAQ Management
  getAdminFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  // Review Management
  getAdminReviews,
  setReviewStatus,
  deleteReview,
  // Inventory Management
  getInventory,
  updateInventory,
  getInventoryHistory,
  // Social Links
  getPublicSocialLinks,
  getAdminSocialLinks,
  updateSocialLink,
  // Contact Inquiries
  getInquiries,
  updateInquiry,
  submitInquiry,
  // Media Library
  getMediaList,
  updateMedia,
  deleteMedia,
  // Message Templates
  getMessageTemplates,
  updateMessageTemplate,
  // Admin Security
  updateAdminSecurity
} = require('../controllers/admin.controller');

const {
  getCustomers,
  getCustomerStats,
  getCustomerById,
  updateCustomer,
  setCustomerStatus,
  deleteCustomer,
  exportCustomers
} = require('../controllers/customer.controller');

const {
  bulkDeleteProducts,
  bulkUpdateProductStatus,
  duplicateProduct
} = require('../controllers/product.controller');

const { getDashboardReports, exportReport, getFinancialReports } = require('../controllers/report.controller');

const { getReach } = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middlewares/auth');

const adminOnly = [protect, authorize('Admin', 'Super Admin')];

// ─── Public Routes ────────────────────────────────────────────────────────────
router.get('/settings', getSettings);
router.get('/offers', getOffers);
router.get('/banners', getBanners);               // frontend reads banners
router.get('/homepage-sections', getHomepageSections); // frontend reads sections
router.get('/social-links/public', getPublicSocialLinks);  // distinct path: the admin list below owns /social-links
router.post('/contact/inquiry', submitInquiry);

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/login/otp', adminLoginOtp);
router.post('/login', adminLogin);

// ─── Settings ────────────────────────────────────────────────────────────────
router.put('/settings', ...adminOnly, updateSettings);
router.put('/security', ...adminOnly, updateAdminSecurity);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs', ...adminOnly, getAuditLogs);

// ─── Offers ───────────────────────────────────────────────────────────────────
router.post('/offers', ...adminOnly, createOffer);
router.delete('/offers/:id', ...adminOnly, deleteOffer);

// ─── Banners (CMS) ────────────────────────────────────────────────────────────
router.post('/banners', ...adminOnly, createBanner);
router.put('/banners/:id', ...adminOnly, updateBanner);
router.delete('/banners/:id', ...adminOnly, deleteBanner);

// ─── Homepage Sections (CMS) ──────────────────────────────────────────────────
router.put('/homepage-sections/reorder', ...adminOnly, reorderHomepageSections);
router.put('/homepage-sections/:name', ...adminOnly, updateHomepageSection);

// ─── FAQ Management ───────────────────────────────────────────────────────────
router.get('/faqs', ...adminOnly, getAdminFaqs);
router.post('/faqs', ...adminOnly, createFaq);
router.put('/faqs/:id', ...adminOnly, updateFaq);
router.delete('/faqs/:id', ...adminOnly, deleteFaq);

// ─── Review Management ────────────────────────────────────────────────────────
router.get('/reviews', ...adminOnly, getAdminReviews);
router.patch('/reviews/:id/status', ...adminOnly, setReviewStatus);
router.delete('/reviews/:id', ...adminOnly, deleteReview);

// ─── Inventory Management ─────────────────────────────────────────────────────
router.get('/inventory/history', ...adminOnly, getInventoryHistory);
router.get('/inventory', ...adminOnly, getInventory);
router.put('/inventory/:id', ...adminOnly, updateInventory);

// ─── Customer Management ─────────────────────────────────────────────────────
// Static segments must come before /:id wildcard
router.get('/customers/stats', ...adminOnly, getCustomerStats);
router.get('/reach', ...adminOnly, getReach);
router.get('/customers/export', ...adminOnly, exportCustomers);
router.get('/customers', ...adminOnly, getCustomers);
router.get('/customers/:id', ...adminOnly, getCustomerById);
router.put('/customers/:id', ...adminOnly, updateCustomer);
router.patch('/customers/:id/status', ...adminOnly, setCustomerStatus);
router.delete('/customers/:id', ...adminOnly, deleteCustomer);

// ─── Reports + Export ────────────────────────────────────────────────────────
router.get('/reports/export', ...adminOnly, exportReport);
router.get('/reports/financials', ...adminOnly, getFinancialReports);
router.get('/reports', ...adminOnly, getDashboardReports);

// ─── Bulk Product Operations ─────────────────────────────────────────────────
router.post('/products/bulk/delete', ...adminOnly, bulkDeleteProducts);
router.post('/products/bulk/status', ...adminOnly, bulkUpdateProductStatus);
router.post('/products/:id/duplicate', ...adminOnly, duplicateProduct);

// ─── Enterprise CMS & Marketing Settings ──────────────────────────────────────
router.get('/social-links', ...adminOnly, getAdminSocialLinks);
router.put('/social-links/:id', ...adminOnly, updateSocialLink);

router.get('/inquiries', ...adminOnly, getInquiries);
router.put('/inquiries/:id', ...adminOnly, updateInquiry);

router.get('/media', ...adminOnly, getMediaList);
router.put('/media/:id', ...adminOnly, updateMedia);
router.delete('/media/:id', ...adminOnly, deleteMedia);

router.get('/templates', ...adminOnly, getMessageTemplates);
router.put('/templates/:id', ...adminOnly, updateMessageTemplate);

module.exports = router;
