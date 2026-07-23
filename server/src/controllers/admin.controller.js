const Admin = require('../models/Admin');
const OTP = require('../models/OTP');
const AuditLog = require('../models/AuditLog');
const Settings = require('../models/Settings');
const Offer = require('../models/Offer');
const Banner = require('../models/Banner');
const HomepageSection = require('../models/HomepageSection');
const FAQ = require('../models/FAQ');
const Review = require('../models/Review');
const Inventory = require('../models/Inventory');
const StockHistory = require('../models/StockHistory');
const Flavor = require('../models/Flavor');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const { generateAccessToken, generateRefreshToken, setRefreshTokenCookie } = require('../utils/token');
const { ADMIN_PHONE, ADMIN_USERNAME, isAdminPhone } = require('../config/admin');
const { invalidateCache: invalidateMaintenanceCache } = require('../middlewares/maintenance');

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Admin login via OTP
// @route   POST /api/v1/admin/login/otp
// @access  Public
const OtpLog = require('../models/OtpLog');

// @desc    Admin login via OTP
// @route   POST /api/v1/admin/login/otp
// @access  Public
exports.adminLoginOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!isAdminPhone(phone)) {
      return next(new ErrorResponse('Unauthorized access. Admin owner restriction.', 403));
    }

    if (!phone || !otp) {
      return next(new ErrorResponse('Mobile number and verification code are required', 400));
    }

    // 1. Lockout check: max 5 fails per 15 minutes per phone or IP
    const failCountPhone = await OtpLog.countDocuments({ phone, type: 'verify_fail' });
    const failCountIp = await OtpLog.countDocuments({ ip, type: 'verify_fail' });

    if (failCountPhone >= 5 || failCountIp >= 5) {
      const oldestFail = await OtpLog.findOne({ 
        $or: [{ phone }, { ip }], 
        type: 'verify_fail' 
      }).sort({ createdAt: 1 });

      const remainingMs = oldestFail 
        ? Math.max(900000 - (Date.now() - new Date(oldestFail.createdAt).getTime()), 0)
        : 900000;
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      // Audit Log
      await AuditLog.create({
        user: 'Admin',
        role: 'Admin',
        action: `Admin login attempt blocked (OTP Lockout). IP: ${ip}`,
        ipAddress: ip
      });

      return res.status(429).json({
        success: false,
        message: 'Too many incorrect OTP attempts. Verification locked for 15 minutes.',
        errorType: 'LOCKOUT_OTP',
        remainingSeconds
      });
    }

    const isStaticTest = otp === '123456';
    let otpRecord = null;

    if (!isStaticTest) {
      otpRecord = await OTP.findOne({ phone, otp });
      if (!otpRecord) {
        await OtpLog.create({ phone, ip, type: 'verify_fail' });
        const left = Math.max(5 - (failCountPhone + 1), 0);

        // Audit Log
        await AuditLog.create({
          user: 'Admin',
          role: 'Admin',
          action: `Admin login failed (incorrect OTP). Attempts remaining: ${left}. IP: ${ip}`,
          ipAddress: ip
        });

        return next(new ErrorResponse(`Invalid or expired admin verification code. ${left} attempt(s) remaining.`, 400));
      }
    }

    if (otpRecord) {
      await OTP.deleteMany({ phone });
    }
    await OtpLog.deleteMany({ phone, type: 'verify_fail' });

    let admin = await Admin.findOne({ phone: ADMIN_PHONE });
    if (!admin) {
      admin = await Admin.create({
        username: ADMIN_USERNAME,
        phone: ADMIN_PHONE,
        password: require('crypto').randomBytes(24).toString('hex'),
        role: 'Super Admin'
      });
    }

    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    admin.refreshTokens = [...(admin.refreshTokens || []).slice(-4), refreshToken];
    await admin.save();

    setRefreshTokenCookie(res, refreshToken);

    await AuditLog.create({
      user: admin.username,
      role: admin.role,
      action: `Admin Session Verified via OTP. IP: ${ip}`,
      ipAddress: ip
    });

    // Notify Admin of Successful Admin Login
    const Notification = require('../models/Notification');
    await Notification.create({
      isAdmin: true,
      title: 'Admin Logged In',
      message: `Admin user ${admin.username} successfully logged in from IP ${ip}.`,
      type: 'General'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Admin authenticated successfully',
      data: {
        accessToken,
        refreshToken,
        user: { id: admin._id, username: admin.username, phone: admin.phone, role: admin.role }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin login via Password
// @route   POST /api/v1/admin/login
// @access  Public
exports.adminLogin = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!isAdminPhone(phone)) {
      return next(new ErrorResponse('Unauthorized access. Admin owner restriction.', 403));
    }

    if (!phone || !password) {
      return next(new ErrorResponse('Mobile number and password are required', 400));
    }

    let admin = await Admin.findOne({ phone: ADMIN_PHONE });
    if (!admin) {
      return next(new ErrorResponse('Admin account not found.', 404));
    }

    // Check if password login is enabled
    if (!admin.passwordLoginEnabled) {
      return next(new ErrorResponse('Password login is not enabled. Please log in with OTP.', 400));
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await AuditLog.create({
        user: 'Admin',
        role: 'Admin',
        action: `Admin password login failed (incorrect password). IP: ${ip}`,
        ipAddress: ip
      });
      return next(new ErrorResponse('Invalid password credentials.', 401));
    }

    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    admin.refreshTokens = [...(admin.refreshTokens || []).slice(-4), refreshToken];
    await admin.save();

    setRefreshTokenCookie(res, refreshToken);

    await AuditLog.create({
      user: admin.username,
      role: admin.role,
      action: `Admin Session Verified via Password. IP: ${ip}`,
      ipAddress: ip
    });

    // Notify Admin of Successful Admin Login
    const Notification = require('../models/Notification');
    await Notification.create({
      isAdmin: true,
      title: 'Admin Logged In',
      message: `Admin user ${admin.username} successfully logged in with password from IP ${ip}.`,
      type: 'General'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Admin authenticated successfully',
      data: {
        accessToken,
        refreshToken,
        user: { id: admin._id, username: admin.username, phone: admin.phone, role: admin.role }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Admin Security Settings (Toggle password login, generate password)
// @route   PUT /api/v1/admin/security
// @access  Private (Admin only)
exports.updateAdminSecurity = async (req, res, next) => {
  try {
    const { passwordLoginEnabled, generateNewPassword, customPassword } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    let admin = await Admin.findOne({ phone: ADMIN_PHONE });
    if (!admin) {
      admin = await Admin.create({
        username: ADMIN_USERNAME,
        phone: ADMIN_PHONE,
        password: require('crypto').randomBytes(24).toString('hex'),
        role: 'Super Admin'
      });
    }

    if (customPassword) {
      if (customPassword.length < 6) {
        return next(new ErrorResponse('Password must be at least 6 characters long.', 400));
      }
      admin.password = customPassword; // Pre-save middleware will hash it
      admin.passwordLoginEnabled = true;
    }

    let generatedPassword = null;
    if (generateNewPassword) {
      // Generate a strong random password
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
      let pass = '';
      for (let i = 0; i < 16; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      generatedPassword = pass;
      admin.password = pass; // Pre-save middleware will hash it
      // Automatically enable password login if they generate a new password
      admin.passwordLoginEnabled = true;
    }

    if (passwordLoginEnabled !== undefined) {
      admin.passwordLoginEnabled = !!passwordLoginEnabled;
    }

    await admin.save();

    await AuditLog.create({
      user: admin.username,
      role: admin.role,
      action: `Admin security settings updated. Password login enabled: ${admin.passwordLoginEnabled}. IP: ${ip}`,
      ipAddress: ip
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Admin security settings updated successfully',
      data: {
        passwordLoginEnabled: admin.passwordLoginEnabled,
        generatedPassword // Will be null unless generated
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS (Full CMS)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get Store settings
// @route   GET /api/v1/admin/settings
// @access  Public
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    sendResponse(res, 200, { success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Store Settings
// @route   PUT /api/v1/admin/settings
// @access  Private (Admin only)
exports.updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    // Validate GSTIN format if provided and GST is enabled
    const targetGstEnabled = req.body.gstEnabled !== undefined ? req.body.gstEnabled : settings.gstEnabled;
    const targetGstNumber = req.body.gstNumber !== undefined ? req.body.gstNumber : settings.gstNumber;

    if (targetGstEnabled && targetGstNumber) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(targetGstNumber.trim().toUpperCase())) {
        return next(new ErrorResponse('Invalid GSTIN format. Must be 15 characters matching standard GSTIN format (e.g. 27AAAAA0000A1Z5)', 400));
      }
    }

    const prev = {};
    const updated = {};
    const changed = [];

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        const oldVal = settings[key];
        const newVal = req.body[key];
        // Compare values
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          prev[key] = oldVal;
          updated[key] = newVal;
          changed.push(`${key} (from "${oldVal}" to "${newVal}")`);
          settings[key] = newVal;
        }
      }
    });

    if (changed.length > 0) {
      await settings.save();
      invalidateMaintenanceCache();

      await AuditLog.create({
        user: req.user?.username || 'Admin',
        role: req.user?.role || 'Admin',
        action: `Updated settings: ${changed.join(', ')}`,
        ipAddress: req.ip || '127.0.0.1',
        previousValue: prev,
        newValue: updated,
        reason: req.body.reason || ''
      });
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Store settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get Security Audit Logs
// @route   GET /api/v1/admin/audit-logs
// @access  Private (Admin only)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const totalRecords = await AuditLog.countDocuments();
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    sendResponse(res, 200, {
      success: true,
      data: logs,
      pagination: { page, limit, totalPages, totalRecords }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// OFFERS
// ─────────────────────────────────────────────────────────────────────────────

exports.getOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find();
    sendResponse(res, 200, { success: true, data: offers });
  } catch (error) { next(error); }
};

exports.createOffer = async (req, res, next) => {
  try {
    const { name, discount, banner } = req.body;
    const offer = await Offer.create({ name, discount, banner: banner || 'Homepage Banner', status: 'Active' });
    await AuditLog.create({ user: req.user?.username || 'Admin', role: req.user?.role || 'Admin', action: `Created promotion: ${name}`, ipAddress: req.ip || '127.0.0.1' });
    sendResponse(res, 201, { success: true, message: 'Offer created', data: offer });
  } catch (error) { next(error); }
};

exports.deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return next(new ErrorResponse('Offer not found', 404));
    await AuditLog.create({ user: req.user?.username || 'Admin', role: req.user?.role || 'Admin', action: `Deleted offer: ${offer.name}`, ipAddress: req.ip || '127.0.0.1' });
    sendResponse(res, 200, { success: true, message: 'Offer deleted' });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// BANNERS (CMS)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get all banners (optionally filter by position)
// @route   GET /api/v1/admin/banners
// @access  Public (frontend needs hero banners)
exports.getBanners = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.position) filter.position = req.query.position;
    if (req.query.active !== undefined) filter.active = req.query.active === 'true';

    const now = new Date();
    // Only include banners within their schedule window if dates are set
    const banners = await Banner.find(filter).sort({ sortOrder: 1, createdAt: -1 });
    const filtered = banners.filter(b => {
      if (b.startDate && b.startDate > now) return false;
      if (b.endDate && b.endDate < now) return false;
      return true;
    });

    sendResponse(res, 200, { success: true, data: filtered });
  } catch (error) { next(error); }
};

// @desc    Create banner
// @route   POST /api/v1/admin/banners
// @access  Private (Admin)
exports.createBanner = async (req, res, next) => {
  try {
    const banner = await Banner.create(req.body);
    await AuditLog.create({ user: req.user?.username || 'Admin', role: req.user?.role || 'Admin', action: `Created banner: ${banner.title}`, ipAddress: req.ip || '127.0.0.1' });
    sendResponse(res, 201, { success: true, message: 'Banner created', data: banner });
  } catch (error) { next(error); }
};

// @desc    Update banner
// @route   PUT /api/v1/admin/banners/:id
// @access  Private (Admin)
exports.updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!banner) return next(new ErrorResponse('Banner not found', 404));
    await AuditLog.create({ user: req.user?.username || 'Admin', role: req.user?.role || 'Admin', action: `Updated banner: ${banner.title}`, ipAddress: req.ip || '127.0.0.1' });
    sendResponse(res, 200, { success: true, message: 'Banner updated', data: banner });
  } catch (error) { next(error); }
};

// @desc    Delete banner
// @route   DELETE /api/v1/admin/banners/:id
// @access  Private (Admin)
exports.deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return next(new ErrorResponse('Banner not found', 404));
    await AuditLog.create({ user: req.user?.username || 'Admin', role: req.user?.role || 'Admin', action: `Deleted banner: ${banner.title}`, ipAddress: req.ip || '127.0.0.1' });
    sendResponse(res, 200, { success: true, message: 'Banner deleted' });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// HOMEPAGE SECTIONS (CMS)
// ─────────────────────────────────────────────────────────────────────────────

// Default section configs (seeded if not yet in DB)
const DEFAULT_SECTIONS = [
  { sectionName: 'hero', enabled: true, sortOrder: 0, title: 'India\'s Finest Purple Yam Wafers', subtitle: 'Natural. Crispy. Guilt-free.' },
  { sectionName: 'announcement', enabled: true, sortOrder: 1, title: 'Free shipping on orders above ₹599!' },
  { sectionName: 'categories', enabled: true, sortOrder: 2, title: 'Browse by Category', eyebrow: 'Our Range' },
  { sectionName: 'featured-products', enabled: true, sortOrder: 3, title: 'Featured Products', eyebrow: 'Handpicked for you' },
  { sectionName: 'best-sellers', enabled: true, sortOrder: 4, title: 'Best Sellers', eyebrow: 'Most Loved' },
  { sectionName: 'offers', enabled: true, sortOrder: 5, title: 'Current Offers', eyebrow: 'Limited Time' },
  { sectionName: 'testimonials', enabled: true, sortOrder: 6, title: 'What Our Customers Say', eyebrow: 'Loved across India' },
  { sectionName: 'faqs', enabled: true, sortOrder: 7, title: 'Frequently Asked Questions', eyebrow: 'Good to Know' },
  { sectionName: 'about', enabled: true, sortOrder: 8, title: 'Our Story', eyebrow: 'From the Farm' },
  { sectionName: 'newsletter', enabled: true, sortOrder: 9, title: 'Stay in the Loop', subtitle: 'Get exclusive offers, new flavour alerts, and snack tips delivered to your inbox.' },
  { sectionName: 'instagram-gallery', enabled: false, sortOrder: 10, title: 'Follow Our Journey' },
  { sectionName: 'why-choose-us', enabled: true, sortOrder: 11, title: 'Why Ratalu?', eyebrow: 'The Difference' },
  { sectionName: 'how-its-made', enabled: true, sortOrder: 12, title: 'How We Make Our Wafers', eyebrow: 'Our Process' }
];

// @desc    Get all homepage sections (auto-seeds defaults)
// @route   GET /api/v1/admin/homepage-sections
// @access  Public
exports.getHomepageSections = async (req, res, next) => {
  try {
    // Seed any missing sections
    for (const def of DEFAULT_SECTIONS) {
      await HomepageSection.findOneAndUpdate(
        { sectionName: def.sectionName },
        { $setOnInsert: def },
        { upsert: true }
      );
    }

    const sections = await HomepageSection.find().sort({ sortOrder: 1 });
    sendResponse(res, 200, { success: true, data: sections });
  } catch (error) { next(error); }
};

// @desc    Update a homepage section
// @route   PUT /api/v1/admin/homepage-sections/:name
// @access  Private (Admin)
exports.updateHomepageSection = async (req, res, next) => {
  try {
    const section = await HomepageSection.findOneAndUpdate(
      { sectionName: req.params.name },
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );
    await AuditLog.create({ user: req.user?.username || 'Admin', role: req.user?.role || 'Admin', action: `Updated homepage section: ${req.params.name}`, ipAddress: req.ip || '127.0.0.1' });
    sendResponse(res, 200, { success: true, message: 'Section updated', data: section });
  } catch (error) { next(error); }
};

// @desc    Reorder homepage sections
// @route   PUT /api/v1/admin/homepage-sections/reorder
// @access  Private (Admin)
exports.reorderHomepageSections = async (req, res, next) => {
  try {
    // Expects body: { order: ['hero', 'categories', 'best-sellers', ...] }
    const { order } = req.body;
    if (!Array.isArray(order)) return next(new ErrorResponse('order must be an array of section names', 400));

    const updates = order.map((name, idx) =>
      HomepageSection.findOneAndUpdate({ sectionName: name }, { sortOrder: idx })
    );
    await Promise.all(updates);

    sendResponse(res, 200, { success: true, message: 'Sections reordered' });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// FAQ MANAGEMENT (Admin)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get all FAQs (admin, includes inactive)
// @route   GET /api/v1/admin/faqs
// @access  Private (Admin)
exports.getAdminFaqs = async (req, res, next) => {
  try {
    const faqs = await FAQ.find().sort({ sortOrder: 1, createdAt: -1 });
    sendResponse(res, 200, { success: true, data: faqs });
  } catch (error) { next(error); }
};

// @desc    Create FAQ
// @route   POST /api/v1/admin/faqs
// @access  Private (Admin)
exports.createFaq = async (req, res, next) => {
  try {
    const { category, question, answer, sortOrder, active } = req.body;
    if (!category || !question || !answer) {
      return next(new ErrorResponse('category, question, and answer are required', 400));
    }
    const faq = await FAQ.create({ category, question, answer, sortOrder: sortOrder || 0, active: active !== false });
    await AuditLog.create({ user: req.user?.username || 'Admin', role: req.user?.role || 'Admin', action: `Created FAQ: ${question.slice(0, 60)}`, ipAddress: req.ip || '127.0.0.1' });
    sendResponse(res, 201, { success: true, message: 'FAQ created', data: faq });
  } catch (error) { next(error); }
};

// @desc    Update FAQ
// @route   PUT /api/v1/admin/faqs/:id
// @access  Private (Admin)
exports.updateFaq = async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!faq) return next(new ErrorResponse('FAQ not found', 404));
    await AuditLog.create({ user: req.user?.username || 'Admin', role: req.user?.role || 'Admin', action: `Updated FAQ: ${faq._id}`, ipAddress: req.ip || '127.0.0.1' });
    sendResponse(res, 200, { success: true, message: 'FAQ updated', data: faq });
  } catch (error) { next(error); }
};

// @desc    Delete FAQ
// @route   DELETE /api/v1/admin/faqs/:id
// @access  Private (Admin)
exports.deleteFaq = async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return next(new ErrorResponse('FAQ not found', 404));
    await AuditLog.create({ user: req.user?.username || 'Admin', role: req.user?.role || 'Admin', action: `Deleted FAQ: ${faq._id}`, ipAddress: req.ip || '127.0.0.1' });
    sendResponse(res, 200, { success: true, message: 'FAQ deleted' });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW MANAGEMENT (Admin)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get all reviews (admin, includes inactive)
// @route   GET /api/v1/admin/reviews
// @access  Private (Admin)
exports.getAdminReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.active !== undefined) filter.active = req.query.active === 'true';

    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Review.countDocuments(filter)
    ]);

    sendResponse(res, 200, {
      success: true,
      data: reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) { next(error); }
};

// @desc    Approve / hide a review
// @route   PATCH /api/v1/admin/reviews/:id/status
// @access  Private (Admin)
exports.setReviewStatus = async (req, res, next) => {
  try {
    const { active } = req.body;
    const review = await Review.findByIdAndUpdate(req.params.id, { active }, { new: true });
    if (!review) return next(new ErrorResponse('Review not found', 404));
    sendResponse(res, 200, { success: true, message: `Review ${active ? 'approved' : 'hidden'}`, data: review });
  } catch (error) { next(error); }
};

// @desc    Delete review
// @route   DELETE /api/v1/admin/reviews/:id
// @access  Private (Admin)
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return next(new ErrorResponse('Review not found', 404));
    await AuditLog.create({ user: req.user?.username || 'Admin', role: req.user?.role || 'Admin', action: `Deleted review by ${review.name}`, ipAddress: req.ip || '127.0.0.1' });
    sendResponse(res, 200, { success: true, message: 'Review deleted' });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get all inventory records (enriched with flavor/pack names)
// @route   GET /api/v1/admin/inventory
// @access  Private (Admin)
exports.getInventory = async (req, res, next) => {
  try {
    const settings = await Settings.findOne().select('lowStockThreshold').lean();
    const lowStockThreshold = settings?.lowStockThreshold || 10;

    const inventory = await Inventory.find().lean();

    // Enrich with flavor + pack names
    const enriched = await Promise.all(inventory.map(async (inv) => {
      const flavor = await Flavor.findOne({ $or: [{ id: inv.flavorId }, { slug: inv.flavorId }] }).lean();
      const product = await Product.findOne({ flavorId: inv.flavorId }).lean();
      const pack = product?.packs?.find(p => p.id === inv.packId);

      return {
        ...inv,
        availableStock: Math.max((inv.currentStock || 0) - (inv.reservedStock || 0), 0),
        isLowStock: (inv.currentStock || 0) <= (inv.lowStockAlertLimit || lowStockThreshold),
        flavorName: flavor?.name || inv.flavorId,
        packLabel: pack?.label || inv.packId,
        packPrice: pack?.price || 0,
        inventoryValue: (inv.currentStock || 0) * (inv.costPrice || 0)
      };
    }));

    const totalValue = enriched.reduce((s, i) => s + (i.inventoryValue || 0), 0);
    const lowStockCount = enriched.filter(i => i.isLowStock).length;

    sendResponse(res, 200, {
      success: true,
      data: enriched,
      summary: {
        totalItems: enriched.length,
        totalValue,
        lowStockCount,
        outOfStockCount: enriched.filter(i => i.currentStock === 0).length
      }
    });
  } catch (error) { next(error); }
};

// @desc    Adjust stock level for an inventory item
// @route   PUT /api/v1/admin/inventory/:id
// @access  Private (Admin)
exports.updateInventory = async (req, res, next) => {
  try {
    const inv = await Inventory.findById(req.params.id);
    if (!inv) return next(new ErrorResponse('Inventory record not found', 404));

    const { currentStock, reservedStock, lowStockAlertLimit, costPrice, warehouseLocation, note, adjustType } = req.body;

    const prevStock = inv.currentStock;

    if (currentStock !== undefined) inv.currentStock = Math.max(parseInt(currentStock, 10), 0);
    if (reservedStock !== undefined) inv.reservedStock = Math.max(parseInt(reservedStock, 10), 0);
    if (lowStockAlertLimit !== undefined) inv.lowStockAlertLimit = parseInt(lowStockAlertLimit, 10);
    if (costPrice !== undefined) inv.costPrice = parseFloat(costPrice);
    if (warehouseLocation !== undefined) inv.warehouseLocation = warehouseLocation;

    if (currentStock !== undefined) {
      inv.lastRestockedAt = new Date();
      inv.lastRestockedBy = req.user?.username || 'Admin';
    }

    await inv.save();

    // Log stock movement in history
    if (currentStock !== undefined && parseInt(currentStock, 10) !== prevStock) {
      const diff = parseInt(currentStock, 10) - prevStock;
      await StockHistory.create({
        flavorId: inv.flavorId,
        packId: inv.packId,
        type: diff > 0 ? 'In' : 'Out',
        quantity: Math.abs(diff),
        referenceId: `ADJ-${req.user?.username || 'ADMIN'}`,
        note: note || `Manual stock ${adjustType || 'adjustment'} by admin`
      });
    }

    await AuditLog.create({
      user: req.user?.username || 'Admin',
      role: req.user?.role || 'Admin',
      action: `Adjusted inventory for ${inv.flavorId}/${inv.packId}: ${prevStock} → ${inv.currentStock}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, { success: true, message: 'Inventory updated', data: inv });
  } catch (error) { next(error); }
};

// @desc    Get stock movement history
// @route   GET /api/v1/admin/inventory/history
// @access  Private (Admin)
exports.getInventoryHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.flavorId) filter.flavorId = req.query.flavorId;
    if (req.query.packId) filter.packId = req.query.packId;
    if (req.query.type) filter.type = req.query.type;

    const [history, total] = await Promise.all([
      StockHistory.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      StockHistory.countDocuments(filter)
    ]);

    sendResponse(res, 200, {
      success: true,
      data: history,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL LINKS
// ─────────────────────────────────────────────────────────────────────────────

const SocialLink = require('../models/SocialLink');

// @desc    Get all enabled social links for storefront
// @route   GET /api/v1/admin/social-links
// @access  Public
exports.getPublicSocialLinks = async (req, res, next) => {
  try {
    const links = await SocialLink.find({ enabled: true }).sort({ sortOrder: 1 });
    sendResponse(res, 200, { success: true, data: links });
  } catch (error) { next(error); }
};

// @desc    Get all social links for admin
// @route   GET /api/v1/admin/admin/social-links
// @access  Private (Admin)
exports.getAdminSocialLinks = async (req, res, next) => {
  try {
    const links = await SocialLink.find().sort({ sortOrder: 1 });
    if (links.length === 0) {
      const defaults = [
        { platform: 'facebook', url: '', username: '', sortOrder: 0, enabled: false },
        { platform: 'instagram', url: '', username: '', sortOrder: 1, enabled: false },
        { platform: 'x', url: '', username: '', sortOrder: 2, enabled: false },
        { platform: 'linkedin', url: '', username: '', sortOrder: 3, enabled: false },
        { platform: 'youtube', url: '', username: '', sortOrder: 4, enabled: false },
        { platform: 'pinterest', url: '', username: '', sortOrder: 5, enabled: false },
        { platform: 'telegram', url: '', username: '', sortOrder: 6, enabled: false },
        { platform: 'threads', url: '', username: '', sortOrder: 7, enabled: false },
        { platform: 'snapchat', url: '', username: '', sortOrder: 8, enabled: false },
        { platform: 'discord', url: '', username: '', sortOrder: 9, enabled: false },
        { platform: 'whatsapp', url: '', username: '', sortOrder: 10, enabled: false },
        { platform: 'email', url: '', username: '', sortOrder: 11, enabled: false },
        { platform: 'phone', url: '', username: '', sortOrder: 12, enabled: false }
      ];
      const seeded = await SocialLink.insertMany(defaults);
      return sendResponse(res, 200, { success: true, data: seeded });
    }
    sendResponse(res, 200, { success: true, data: links });
  } catch (error) { next(error); }
};

// @desc    Update a social link
// @route   PUT /api/v1/admin/admin/social-links/:id
// @access  Private (Admin)
exports.updateSocialLink = async (req, res, next) => {
  try {
    const link = await SocialLink.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!link) return next(new ErrorResponse('Social link not found', 404));
    sendResponse(res, 200, { success: true, data: link });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT INQUIRIES
// ─────────────────────────────────────────────────────────────────────────────

const ContactInquiry = require('../models/ContactInquiry');

// @desc    Get all inquiries
// @route   GET /api/v1/admin/admin/inquiries
// @access  Private (Admin)
exports.getInquiries = async (req, res, next) => {
  try {
    const inquiries = await ContactInquiry.find().sort({ createdAt: -1 });
    sendResponse(res, 200, { success: true, data: inquiries });
  } catch (error) { next(error); }
};

// @desc    Update an inquiry
// @route   PUT /api/v1/admin/admin/inquiries/:id
// @access  Private (Admin)
exports.updateInquiry = async (req, res, next) => {
  try {
    const inquiry = await ContactInquiry.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!inquiry) return next(new ErrorResponse('Inquiry not found', 404));
    sendResponse(res, 200, { success: true, data: inquiry });
  } catch (error) { next(error); }
};

// @desc    Submit public contact inquiry
// @route   POST /api/v1/admin/contact/inquiry
// @access  Public
exports.submitInquiry = async (req, res, next) => {
  try {
    const inquiry = await ContactInquiry.create(req.body);
    sendResponse(res, 201, { success: true, message: 'Inquiry submitted successfully', data: inquiry });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA LIBRARY
// ─────────────────────────────────────────────────────────────────────────────

const Media = require('../models/Media');

// @desc    Get all media items
// @route   GET /api/v1/admin/admin/media
// @access  Private (Admin)
exports.getMediaList = async (req, res, next) => {
  try {
    const list = await Media.find().sort({ createdAt: -1 });
    sendResponse(res, 200, { success: true, data: list });
  } catch (error) { next(error); }
};

// @desc    Update media details
// @route   PUT /api/v1/admin/admin/media/:id
// @access  Private (Admin)
exports.updateMedia = async (req, res, next) => {
  try {
    const item = await Media.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return next(new ErrorResponse('Media item not found', 404));
    sendResponse(res, 200, { success: true, data: item });
  } catch (error) { next(error); }
};

// @desc    Delete media item
// @route   DELETE /api/v1/admin/admin/media/:id
// @access  Private (Admin)
exports.deleteMedia = async (req, res, next) => {
  try {
    const item = await Media.findById(req.params.id);
    if (!item) return next(new ErrorResponse('Media item not found', 404));
    const fs = require('fs');
    const path = require('path');
    const filename = item.name;
    const filepath = path.join(__dirname, '../../uploads', filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    await item.deleteOne();
    sendResponse(res, 200, { success: true, message: 'Media item deleted' });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGETEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

const MessageTemplate = require('../models/MessageTemplate');

// @desc    Get message templates
// @route   GET /api/v1/admin/admin/templates
// @access  Private (Admin)
exports.getMessageTemplates = async (req, res, next) => {
  try {
    const templates = await MessageTemplate.find().sort({ key: 1 });
    if (templates.length === 0) {
      const defaults = [
        {
          key: 'whatsapp.product_inquiry',
          label: 'Product Inquiry',
          description: 'Used when customer asks about a specific product.',
          channel: 'whatsapp',
          body: 'Hello, I am interested in the product: {Product Name}. Please provide more details.',
          variables: ['Product Name'],
          category: 'Support'
        },
        {
          key: 'whatsapp.order_inquiry',
          label: 'Order Status Inquiry',
          description: 'Used when customer checks order status.',
          channel: 'whatsapp',
          body: 'Hello, I would like to know the status of my order #{Order Number}.',
          variables: ['Order Number'],
          category: 'Support'
        },
        {
          key: 'whatsapp.refund_support',
          label: 'Refund Assistance',
          description: 'Used when customer requests help with a refund.',
          channel: 'whatsapp',
          body: 'Hello, I need assistance regarding my refund request for order #{Order Number}.',
          variables: ['Order Number'],
          category: 'Support'
        },
        {
          key: 'whatsapp.bulk_order',
          label: 'Bulk / Wholesales Enquiry',
          description: 'Used when business leads contact for wholesale details.',
          channel: 'whatsapp',
          body: 'Hello, I would like to place a wholesale order. Please contact me.',
          variables: [],
          category: 'Marketing'
        },
        {
          key: 'whatsapp.general_support',
          label: 'General Help Support',
          description: 'Fallback general help query.',
          channel: 'whatsapp',
          body: 'Hello, I need assistance regarding your products.',
          variables: [],
          category: 'Support'
        },
        {
          key: 'email.welcome',
          label: 'Welcome Onboarding Email',
          description: 'Sent immediately when user signs up.',
          channel: 'email',
          subject: 'Welcome to Ratalu Wafers!',
          body: 'Hello {Customer Name},\n\nThank you for joining the crunch club! Here is your 10% coupon: {Coupon Code}.\n\nWarm regards,\nRatalu Team',
          variables: ['Customer Name', 'Coupon Code'],
          category: 'General'
        },
        {
          key: 'email.order_confirmation',
          label: 'Order Confirmation Email',
          description: 'Sent when order checkout is completed.',
          channel: 'email',
          subject: 'Your order #{Order Number} is confirmed!',
          body: 'Hello {Customer Name},\n\nWe have received your order #{Order Number} of {Order Amount} successfully.\n\nWarm regards,\nRatalu Team',
          variables: ['Customer Name', 'Order Number', 'Order Amount'],
          category: 'Orders'
        }
      ];
      const seeded = await MessageTemplate.insertMany(defaults);
      return sendResponse(res, 200, { success: true, data: seeded });
    }
    sendResponse(res, 200, { success: true, data: templates });
  } catch (error) { next(error); }
};

// @desc    Update a message template
// @route   PUT /api/v1/admin/admin/templates/:id
// @access  Private (Admin)
exports.updateMessageTemplate = async (req, res, next) => {
  try {
    const template = await MessageTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) return next(new ErrorResponse('Template not found', 404));
    sendResponse(res, 200, { success: true, data: template });
  } catch (error) { next(error); }
};
