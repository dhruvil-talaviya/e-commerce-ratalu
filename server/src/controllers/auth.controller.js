const Customer = require('../models/Customer');
const OTP = require('../models/OTP');
const OtpLog = require('../models/OtpLog');
const AuditLog = require('../models/AuditLog');
const { sendSMS } = require('../utils/otp');
const { generateAccessToken, generateRefreshToken, setRefreshTokenCookie, clearRefreshTokenCookie } = require('../utils/token');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const jwt = require('jsonwebtoken');
const { isAdminPhone } = require('../config/admin');

// @desc    Send OTP to Mobile
// @route   POST /api/v1/auth/otp/send
// @access  Public
exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!phone) {
      return next(new ErrorResponse('Mobile number is required', 400));
    }

    // 1. Rate limit check: max 5 requests per 15 minutes per phone or IP
    const requestCountPhone = await OtpLog.countDocuments({ phone, type: 'request' });
    const requestCountIp = await OtpLog.countDocuments({ ip, type: 'request' });

    if (requestCountPhone >= 5 || requestCountIp >= 5) {
      const oldestLog = await OtpLog.findOne({ 
        $or: [{ phone }, { ip }], 
        type: 'request' 
      }).sort({ createdAt: 1 });

      const remainingMs = oldestLog 
        ? Math.max(900000 - (Date.now() - new Date(oldestLog.createdAt).getTime()), 0)
        : 900000;
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      // Audit Log
      await AuditLog.create({
        user: phone,
        role: 'Customer',
        action: `OTP request blocked (Rate limited). IP: ${ip}`,
        ipAddress: ip
      });

      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again after 15 minutes.',
        errorType: 'RATE_LIMIT_OTP',
        remainingSeconds
      });
    }

    // Check if admin is logging in and has password login enabled
    const isAdmin = isAdminPhone(phone);
    if (isAdmin) {
      const Admin = require('../models/Admin');
      const admin = await Admin.findOne({ phone });
      if (admin && admin.passwordLoginEnabled) {
        return sendResponse(res, 200, {
          success: true,
          message: 'Admin password authentication required.',
          data: {
            isRegistered: true,
            isAdmin: true,
            passwordRequired: true
          }
        });
      }
    }

    // Check if customer exists
    const customer = await Customer.findOne({ phone });
    const isRegistered = !!customer;

    if (customer && customer.status === 'Blocked') {
      return next(new ErrorResponse('Your account has been suspended. Please contact support.', 403));
    }

    // Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to OTP collection (expires in 5 mins automatically via TTL)
    await OTP.create({ phone, otp: otpCode });

    // Save transient request log (expires in 15 mins via TTL)
    await OtpLog.create({ phone, ip, type: 'request' });

    // Send via SMS Dispatcher utility
    await sendSMS(phone, otpCode);

    // Audit Log
    await AuditLog.create({
      user: phone,
      role: 'Customer',
      action: `OTP sent successfully. IP: ${ip}`,
      ipAddress: ip
    });

    sendResponse(res, 200, {
      success: true,
      message: 'OTP sent successfully',
      data: {
        isRegistered,
        isAdmin: isAdminPhone(phone),
        otp: process.env.NODE_ENV === 'development' ? otpCode : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

/** Single source of truth for the customer payload returned to the client. */
const serializeCustomer = (customer) => ({
  id: customer._id,
  name: customer.name || '',
  phone: customer.phone,
  email: customer.email || '',
  role: customer.role,
  addresses: customer.addresses,
  activeAddressId: customer.activeAddressId,
  profileComplete: Boolean(customer.name && customer.name.trim().length > 0)
});

/** Issue a fresh access/refresh pair and persist the refresh token. */
const issueSession = async (customer) => {
  const accessToken = generateAccessToken(customer);
  const refreshToken = generateRefreshToken(customer);
  customer.refreshTokens.push(refreshToken);
  await customer.save();
  return { accessToken, refreshToken };
};

// @desc    Verify OTP — passwordless login OR auto-registration
// @route   POST /api/v1/auth/otp/verify
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!phone || !otp) {
      return next(new ErrorResponse('Mobile number and verification code are required', 400));
    }

    // 2. Lockout check: max 5 fails per 15 minutes per phone or IP
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
        user: phone,
        role: 'Customer',
        action: `Login attempt blocked (OTP Lockout). IP: ${ip}`,
        ipAddress: ip
      });

      return res.status(429).json({
        success: false,
        message: 'Too many incorrect OTP attempts. Verification locked for 15 minutes.',
        errorType: 'LOCKOUT_OTP',
        remainingSeconds
      });
    }

    if (isAdminPhone(phone)) {
      return next(new ErrorResponse(
        'This number is registered as the store admin. Please sign in from the admin console.',
        403
      ));
    }

    // A fixed test code is convenient locally but must NEVER work in production.
    const devBypass = process.env.NODE_ENV === 'development' && otp === '123456';

    if (!devBypass) {
      // Grab the most recent OTP issued for this number.
      const otpRecord = await OTP.findOne({ phone }).sort({ createdAt: -1 });

      if (!otpRecord) {
        await OtpLog.create({ phone, ip, type: 'verify_fail' });
        const left = Math.max(5 - (failCountPhone + 1), 0);

        // Audit Log
        await AuditLog.create({
          user: phone,
          role: 'Customer',
          action: `OTP verification failed (expired or invalid). Attempts remaining: ${left}. IP: ${ip}`,
          ipAddress: ip
        });

        return next(new ErrorResponse(`Verification code has expired or is invalid. ${left} attempt(s) remaining.`, 400));
      }

      if (otpRecord.otp !== otp) {
        otpRecord.attempts += 1;
        await otpRecord.save();

        await OtpLog.create({ phone, ip, type: 'verify_fail' });
        const left = Math.max(5 - (failCountPhone + 1), 0);

        // Audit Log
        await AuditLog.create({
          user: phone,
          role: 'Customer',
          action: `OTP verification failed (incorrect code). Attempts remaining: ${left}. IP: ${ip}`,
          ipAddress: ip
        });

        if (otpRecord.attempts >= OTP.MAX_ATTEMPTS) {
          await OTP.deleteMany({ phone });
        }

        return next(new ErrorResponse(`Incorrect verification code. ${left} attempt(s) remaining.`, 400));
      }

      // Correct — consume every OTP and reset failed attempts for this number.
      await OTP.deleteMany({ phone });
      await OtpLog.deleteMany({ phone, type: 'verify_fail' });
    }

    let customer = await Customer.findOne({ phone });
    let isNewUser = false;

    if (!customer) {
      // Auto-register: the verified mobile number IS the identity.
      customer = await Customer.create({
        phone,
        name: '',
        addresses: [],
        activeAddressId: null
      });
      isNewUser = true;

      // Notify Admin
      const Notification = require('../models/Notification');
      await Notification.create({
        isAdmin: true,
        title: 'New Customer Registered',
        message: `Customer with mobile +91 ${phone} has joined the store.`,
        type: 'General'
      });
    }

    if (customer.status === 'Blocked') {
      return next(new ErrorResponse('Your account has been suspended. Please contact support.', 403));
    }

    const { accessToken, refreshToken } = await issueSession(customer);
    const user = serializeCustomer(customer);

    // Send Refresh Token in HTTP-Only Cookie
    setRefreshTokenCookie(res, refreshToken);

    // Audit Log
    await AuditLog.create({
      user: phone,
      role: 'Customer',
      action: isNewUser ? `Customer registered and logged in. IP: ${ip}` : `Customer logged in. IP: ${ip}`,
      ipAddress: ip
    });

    sendResponse(res, isNewUser ? 201 : 200, {
      success: true,
      message: isNewUser ? 'Account created and logged in' : 'Logged in successfully',
      data: {
        isNewUser,
        isRegistered: true,
        profileComplete: user.profileComplete,
        accessToken,
        refreshToken,
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register New Customer
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    if (isAdminPhone(phone)) {
      return next(new ErrorResponse(
        'This number is registered as the store admin. Please sign in from the admin console.',
        403
      ));
    }

    // Check if customer already exists
    let customer = await Customer.findOne({ phone });
    if (customer) {
      return next(new ErrorResponse('Mobile number already registered', 400));
    }

    // Create user
    customer = await Customer.create({
      name,
      phone,
      addresses: [],
      activeAddressId: null
    });

    const accessToken = generateAccessToken(customer);
    const refreshToken = generateRefreshToken(customer);

    customer.refreshTokens.push(refreshToken);
    await customer.save();

    // Send Refresh Token in HTTP-Only Cookie
    setRefreshTokenCookie(res, refreshToken);

    sendResponse(res, 201, {
      success: true,
      message: 'Account created successfully',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          addresses: customer.addresses,
          activeAddressId: customer.activeAddressId
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh Expired Token
// @route   POST /api/v1/auth/refresh
// @access  Public
exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return next(new ErrorResponse('Refresh token required', 400));
    }

    // Decode refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user in database
    let user;
    if (decoded.role === 'Customer') {
      user = await Customer.findById(decoded.id);
    } else {
      const Admin = require('../models/Admin');
      user = await Admin.findById(decoded.id);
    }

    if (!user) {
      clearRefreshTokenCookie(res);
      return next(new ErrorResponse('User not found', 401));
    }

    // Reuse detection (theft protection)
    if (!user.refreshTokens.includes(refreshToken)) {
      user.refreshTokens = [];
      await user.save();
      clearRefreshTokenCookie(res);
      return next(new ErrorResponse('Session breached: Token reused. All active sessions invalidated.', 401));
    }

    // Rotate refresh token (remove old, generate & add new)
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshTokens.push(newRefreshToken);
    await user.save();

    // Update HTTP-Only Cookie with rotated token
    setRefreshTokenCookie(res, newRefreshToken);

    sendResponse(res, 200, {
      success: true,
      message: 'Token refreshed',
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(new ErrorResponse('Invalid or expired refresh token', 401));
  }
};

// @desc    Logout User / Invalidate Refresh Token
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken && req.user) {
      if (req.user.role === 'Customer') {
        req.user.refreshTokens = req.user.refreshTokens.filter(t => t !== refreshToken);
        await req.user.save();
      } else {
        const Admin = require('../models/Admin');
        const adminObj = await Admin.findById(req.user._id);
        if (adminObj) {
          adminObj.refreshTokens = adminObj.refreshTokens.filter(t => t !== refreshToken);
          await adminObj.save();
        }
      }
    }

    // Clear HTTP-Only Cookie
    clearRefreshTokenCookie(res);

    sendResponse(res, 200, {
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(error);
  }
};

// @desc    Get Current Logged in User Profile
// @route   GET /api/v1/auth/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    sendResponse(res, 200, {
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        phone: req.user.phone,
        addresses: req.user.addresses,
        activeAddressId: req.user.activeAddressId,
        role: req.user.role,
        passwordLoginEnabled: req.user.role !== 'Customer' ? req.user.passwordLoginEnabled : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update User Name/Phone
// @route   PUT /api/v1/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;

    if (phone && isAdminPhone(phone)) {
      return next(new ErrorResponse(
        'This number is reserved for the store admin and cannot be used on a customer account.',
        403
      ));
    }

    if (phone && phone !== req.user.phone) {
      // Validate unique number check
      const dupe = await Customer.findOne({ phone });
      if (dupe) {
        return next(new ErrorResponse('Mobile number already taken by another account', 400));
      }
      req.user.phone = phone;
    }

    if (email !== undefined) {
      const trimmed = String(email).trim().toLowerCase();
      if (trimmed) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return next(new ErrorResponse('Please provide a valid email address', 400));
        }
        const emailTaken = await Customer.findOne({ email: trimmed, _id: { $ne: req.user._id } });
        if (emailTaken) {
          return next(new ErrorResponse('Email already in use by another account', 400));
        }
      }
      req.user.email = trimmed || undefined;
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return next(new ErrorResponse('Name cannot be empty', 400));
      }
      req.user.name = trimmedName;
    }

    await req.user.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Profile updated successfully',
      data: serializeCustomer(req.user)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add Address to Book
// @route   POST /api/v1/auth/addresses
// @access  Private
exports.addAddress = async (req, res, next) => {
  try {
    const {
      tag, addressLine, city, state, pincode,
      fullName, mobile, addressLine2, landmark, country
    } = req.body;

    // Required fields (unchanged contract).
    if (!addressLine || !city || !state || !pincode) {
      return next(new ErrorResponse('Address line, city, state and pincode are required', 400));
    }
    if (!/^\d{6}$/.test(String(pincode))) {
      return next(new ErrorResponse('Pincode must be 6 digits', 400));
    }

    req.user.addresses.push({
      tag,
      addressLine,
      city,
      state,
      pincode,
      fullName,
      mobile,
      addressLine2,
      landmark,
      country
    });

    // Set active if it is the first address added
    const createdAddress = req.user.addresses[req.user.addresses.length - 1];
    if (!req.user.activeAddressId) {
      req.user.activeAddressId = createdAddress._id.toString();
    }

    await req.user.save();

    sendResponse(res, 201, {
      success: true,
      message: 'Address added successfully',
      data: {
        addresses: req.user.addresses,
        activeAddressId: req.user.activeAddressId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing address
// @route   PUT /api/v1/auth/addresses/:id
// @access  Private
exports.updateAddress = async (req, res, next) => {
  try {
    const address = req.user.addresses.id(req.params.id);
    if (!address) {
      return next(new ErrorResponse('Address not found', 404));
    }

    const editable = [
      'tag', 'addressLine', 'city', 'state', 'pincode',
      'fullName', 'mobile', 'addressLine2', 'landmark', 'country'
    ];
    editable.forEach((field) => {
      if (req.body[field] !== undefined) address[field] = req.body[field];
    });

    if (address.pincode && !/^\d{6}$/.test(String(address.pincode))) {
      return next(new ErrorResponse('Pincode must be 6 digits', 400));
    }

    await req.user.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Address updated successfully',
      data: {
        addresses: req.user.addresses,
        activeAddressId: req.user.activeAddressId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Address from Book
// @route   DELETE /api/v1/auth/addresses/:id
// @access  Private
exports.deleteAddress = async (req, res, next) => {
  try {
    const addressId = req.params.id;

    req.user.addresses = req.user.addresses.filter(a => a._id.toString() !== addressId);

    // Update active address if deleted
    if (req.user.activeAddressId === addressId) {
      req.user.activeAddressId = req.user.addresses.length > 0 ? req.user.addresses[0]._id.toString() : null;
    }

    await req.user.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Address deleted successfully',
      data: {
        addresses: req.user.addresses,
        activeAddressId: req.user.activeAddressId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set Active Address
// @route   PUT /api/v1/auth/addresses/:id/active
// @access  Private
exports.setActiveAddress = async (req, res, next) => {
  try {
    const addressId = req.params.id;

    // Verify address exists
    const match = req.user.addresses.find(a => a._id.toString() === addressId);
    if (!match) {
      return next(new ErrorResponse('Address not found in book', 404));
    }

    req.user.activeAddressId = addressId;
    await req.user.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Active address updated',
      data: {
        activeAddressId: req.user.activeAddressId
      }
    });
  } catch (error) {
    next(error);
  }
};
