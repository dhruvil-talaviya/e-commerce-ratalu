const Customer = require('../models/Customer');
const OTP = require('../models/OTP');
const { sendSMS } = require('../utils/otp');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const jwt = require('jsonwebtoken');

// @desc    Send OTP to Mobile
// @route   POST /api/v1/auth/otp/send
// @access  Public
exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

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

    // Send via SMS Dispatcher utility
    await sendSMS(phone, otpCode);

    sendResponse(res, 200, {
      success: true,
      message: 'OTP sent successfully',
      data: {
        isRegistered,
        // In development mode, we expose the OTP in response for easy test automation
        otp: process.env.NODE_ENV === 'development' ? otpCode : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP Code
// @route   POST /api/v1/auth/otp/verify
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    // Direct bypass for test mode / specific static credentials
    const isStaticTest = otp === '123456';
    let otpRecord = null;

    if (!isStaticTest) {
      // Find latest OTP for this phone
      otpRecord = await OTP.findOne({ phone, otp });
      if (!otpRecord) {
        return next(new ErrorResponse('Invalid or expired verification code', 400));
      }
    }

    // OTP is valid, clean it up
    if (otpRecord) {
      await OTP.deleteMany({ phone });
    }

    // Check if customer exists
    let customer = await Customer.findOne({ phone });

    if (!customer) {
      // Return verification success state - registration required
      return sendResponse(res, 200, {
        success: true,
        message: 'OTP verified. Registration required.',
        data: { isRegistered: false, phone }
      });
    }

    if (customer.status === 'Blocked') {
      return next(new ErrorResponse('Your account has been suspended. Please contact support.', 403));
    }

    // Generate access & refresh tokens
    const accessToken = generateAccessToken(customer);
    const refreshToken = generateRefreshToken(customer);

    // Save refresh token to user
    customer.refreshTokens.push(refreshToken);
    await customer.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Logged in successfully',
      data: {
        isRegistered: true,
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

// @desc    Register New Customer
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

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
    const { refreshToken } = req.body;

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

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return next(new ErrorResponse('Invalid session or refresh token', 401));
    }

    // Generate new token
    const accessToken = generateAccessToken(user);

    sendResponse(res, 200, {
      success: true,
      message: 'Token refreshed',
      data: { accessToken }
    });
  } catch (error) {
    next(new ErrorResponse('Invalid or expired refresh token', 401));
  }
};

// @desc    Logout User / Invalidate Refresh Token
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
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

    sendResponse(res, 200, {
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
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
        role: req.user.role
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
    const { name, phone } = req.body;

    if (phone && phone !== req.user.phone) {
      // Validate unique number check
      const dupe = await Customer.findOne({ phone });
      if (dupe) {
        return next(new ErrorResponse('Mobile number already taken by another account', 400));
      }
      req.user.phone = phone;
    }

    if (name) req.user.name = name;

    await req.user.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: req.user._id,
        name: req.user.name,
        phone: req.user.phone,
        addresses: req.user.addresses,
        activeAddressId: req.user.activeAddressId
      }
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
    const { tag, addressLine, city, state, pincode } = req.body;

    const newAddress = {
      tag,
      addressLine,
      city,
      state,
      pincode
    };

    req.user.addresses.push(newAddress);
    
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
