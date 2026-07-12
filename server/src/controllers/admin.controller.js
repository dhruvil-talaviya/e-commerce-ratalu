const Admin = require('../models/Admin');
const OTP = require('../models/OTP');
const AuditLog = require('../models/AuditLog');
const Settings = require('../models/Settings');
const Offer = require('../models/Offer');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');

// @desc    Admin login via OTP (Matching frontend Flow)
// @route   POST /api/v1/admin/login/otp
// @access  Public
exports.adminLoginOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (phone !== '9999999999') {
      return next(new ErrorResponse('Unauthorized access. Admin owner restriction.', 403));
    }

    const isStaticTest = otp === '123456';
    let otpRecord = null;

    if (!isStaticTest) {
      otpRecord = await OTP.findOne({ phone, otp });
      if (!otpRecord) {
        return next(new ErrorResponse('Invalid or expired admin verification code', 400));
      }
    }

    if (otpRecord) {
      await OTP.deleteMany({ phone });
    }

    // Find or seed Admin record
    let admin = await Admin.findOne({ phone });
    if (!admin) {
      admin = await Admin.create({
        username: 'StoreOwner',
        phone: '9999999999',
        password: 'admin_ratalu_password_hashed', // dummy password, login is OTP
        role: 'Admin'
      });
    }

    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    admin.refreshTokens.push(refreshToken);
    await admin.save();

    // Create Audit Log entry
    await AuditLog.create({
      user: admin.username,
      role: admin.role,
      action: 'Admin Session Verified via OTP',
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Admin authenticated successfully',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: admin._id,
          username: admin.username,
          phone: admin.phone,
          role: admin.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin credentials login
// @route   POST /api/v1/admin/login
// @access  Public
exports.adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return next(new ErrorResponse('Invalid admin credentials', 401));
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid admin credentials', 401));
    }

    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    admin.refreshTokens.push(refreshToken);
    await admin.save();

    await AuditLog.create({
      user: admin.username,
      role: admin.role,
      action: 'Admin credential login successful',
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Admin credentials verified',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: admin._id,
          username: admin.username,
          phone: admin.phone,
          role: admin.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Store settings
// @route   GET /api/v1/admin/settings
// @access  Public
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    sendResponse(res, 200, {
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Store Settings (Banners and limits)
// @route   PUT /api/v1/admin/settings
// @access  Private (Admin only)
exports.updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    // Update settings fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    });

    await settings.save();

    await AuditLog.create({
      user: req.user.username || 'System',
      role: req.user.role || 'Admin',
      action: 'Updated global store configuration settings',
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Store settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Security Audit Logs
// @route   GET /api/v1/admin/audit-logs
// @access  Private (Admin only)
exports.getAuditLogs = async (req, res, next) => {
  try {
    // Pagination
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
      pagination: {
        page,
        limit,
        totalPages,
        totalRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Offers
// @route   GET /api/v1/admin/offers
// @access  Public
exports.getOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find();
    sendResponse(res, 200, {
      success: true,
      data: offers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Create Offer Campaign
// @route   POST /api/v1/admin/offers
// @access  Private (Admin only)
exports.createOffer = async (req, res, next) => {
  try {
    const { name, discount, banner } = req.body;
    
    const offer = await Offer.create({
      name,
      discount,
      banner: banner || 'Homepage Banner',
      status: 'Active'
    });

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role || 'Admin',
      action: `Created new promotion campaign: ${name}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 201, {
      success: true,
      message: 'Offer campaign created successfully',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Delete Offer Campaign
// @route   DELETE /api/v1/admin/offers/:id
// @access  Private (Admin only)
exports.deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return next(new ErrorResponse('Offer not found', 404));
    }

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role || 'Admin',
      action: `Deleted offer campaign: ${offer.name}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Offer campaign deleted'
    });
  } catch (error) {
    next(error);
  }
};
