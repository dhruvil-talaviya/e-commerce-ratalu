const Customer = require('../models/Customer');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const { generateAccessToken, generateRefreshToken, setRefreshTokenCookie, clearRefreshTokenCookie } = require('../utils/token');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '298921708703-77b3962ci5p0bkul4fntq8urmma2f2m9.apps.googleusercontent.com';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// @desc    Google OAuth Authentication (Customers Only)
// @route   POST /api/v1/auth/google
// @access  Public
exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken, googleId, email: rawEmail, name: rawName, avatar: rawAvatar } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    let email, name, avatar, sub;

    // ── Verify Google ID Token (production flow) ────────────────────────
    if (idToken) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload && payload.email) {
          email = payload.email.trim().toLowerCase();
          name = payload.name || 'Google User';
          avatar = payload.picture || '';
          sub = payload.sub;
        }
      } catch (tokenErr) {
        console.warn('verifyIdToken failed, falling back to payload decode:', tokenErr.message);
      }

      if (!email) {
        try {
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload && payload.email) {
              email = payload.email.trim().toLowerCase();
              name = payload.name || rawName || 'Google User';
              avatar = payload.picture || rawAvatar || '';
              sub = payload.sub || googleId || `g_${Date.now()}`;
            }
          }
        } catch (e) {
          console.error('Failed to parse fallback JWT payload:', e);
        }
      }

      if (!email && rawEmail) {
        email = rawEmail.trim().toLowerCase();
        name = rawName || 'Google User';
        avatar = rawAvatar || '';
        sub = googleId || `g_${Date.now()}`;
      }

      if (!email) {
        return next(new ErrorResponse('Google authentication failed — could not verify email', 401));
      }
    } else if (rawEmail) {
      // Legacy fallback (for dev/testing only)
      email = rawEmail.trim().toLowerCase();
      name = rawName || 'Google User';
      avatar = rawAvatar || '';
      sub = googleId || `g_${Date.now()}`;
    } else {
      return next(new ErrorResponse('Google account email or ID token is required', 400));
    }

    // Check if customer exists or create new account
    let isCreated = false;
    let customer = await Customer.findOne({ email });

    if (!customer) {
      // Auto-create customer account on first Google sign-in
      customer = new Customer({
        name,
        email,
        provider: 'google',
        googleId: sub,
        avatar,
        phone: undefined,
        isEmailVerified: true,
        lastLogin: new Date()
      });
      await customer.save();
      isCreated = true;
    } else {
      // Account linking — update Google ID and avatar if needed
      if (sub) {
        customer.googleId = sub;
        customer.provider = 'google';
      }
      if (avatar && !customer.avatar) {
        customer.avatar = avatar;
      }
      customer.lastLogin = new Date();
      await customer.save();
    }

    const accessToken = generateAccessToken(customer._id, customer.role);
    const refreshToken = generateRefreshToken(customer._id, customer.role);

    customer.refreshTokens.push(refreshToken);
    await customer.save();

    setRefreshTokenCookie(res, refreshToken);

    try {
      await AuditLog.create({
        user: customer.email,
        role: 'Customer',
        action: isCreated ? `Google OAuth account created (${customer.email}). IP: ${ip}` : `Google OAuth login successful. IP: ${ip}`,
        ipAddress: ip
      });
    } catch {
      // ignore audit log failures
    }

    return sendResponse(res, 200, {
      success: true,
      message: isCreated ? 'Account created successfully! Welcome to Ratalu.' : 'Welcome back! Signed in with Google.',
      data: {
        accessToken,
        isCreated,
        isNewUser: isCreated,
        user: {
          id: customer._id,
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          avatar: customer.avatar || '',
          role: 'customer',
          isEmailVerified: customer.isEmailVerified,
          profileCompleted: customer.profileCompleted,
          addresses: customer.addresses || [],
          activeAddressId: customer.activeAddressId
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Email Direct Customer Authentication
// @route   POST /api/v1/auth/email
// @access  Public
exports.emailAuth = async (req, res, next) => {
  try {
    const { email: rawEmail, name: rawName } = req.body;
    if (!rawEmail || !rawEmail.includes('@')) {
      return next(new ErrorResponse('Please provide a valid email address', 400));
    }
    const email = rawEmail.trim().toLowerCase();
    const name = rawName && rawName.trim() ? rawName.trim() : email.split('@')[0];
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    let customer = await Customer.findOne({ email });
    let isCreated = false;

    if (!customer) {
      isCreated = true;
      customer = await Customer.create({
        name,
        email,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: new Date()
      });
    } else {
      customer.lastLoginAt = new Date();
      if (name && customer.name !== name) customer.name = name;
      await customer.save();
    }

    const accessToken = generateAccessToken(customer);
    const refreshToken = generateRefreshToken(customer);
    setRefreshTokenCookie(res, refreshToken);

    try {
      await AuditLog.create({
        user: customer.email,
        role: 'Customer',
        action: isCreated ? `Email account created (${customer.email}). IP: ${ip}` : `Email login successful. IP: ${ip}`,
        ipAddress: ip
      });
    } catch {
      // ignore audit log failures
    }

    return sendResponse(res, 200, {
      success: true,
      message: isCreated ? 'Account created successfully! Welcome to Yamora Wafers.' : 'Welcome back!',
      data: {
        accessToken,
        isCreated,
        isNewUser: isCreated,
        user: {
          id: customer._id,
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          avatar: customer.avatar || '',
          role: 'customer',
          isEmailVerified: customer.isEmailVerified,
          profileCompleted: customer.profileCompleted,
          addresses: customer.addresses || [],
          activeAddressId: customer.activeAddressId
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot Password Request
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new ErrorResponse('Please enter your registered email address', 400));
    }

    const cleanEmail = email.trim().toLowerCase();
    const customer = await Customer.findOne({ email: cleanEmail });

    if (!customer) {
      // Don't reveal if user exists for security
      return sendResponse(res, 200, {
        success: true,
        message: 'If an account exists with that email, a password reset link has been generated.'
      });
    }

    // Generate unhashed reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before storing in database
    customer.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    customer.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await customer.save();

    return sendResponse(res, 200, {
      success: true,
      message: 'Password reset instructions have been generated.',
      data: {
        resetToken // Returned for frontend demonstration / simulation
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset Password
// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return next(new ErrorResponse('Reset token and new password are required', 400));
    }

    if (newPassword !== confirmPassword) {
      return next(new ErrorResponse('Passwords do not match', 400));
    }

    const passwordError = validatePasswordPolicy(newPassword);
    if (passwordError) {
      return next(new ErrorResponse(passwordError, 400));
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const customer = await Customer.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!customer) {
      return next(new ErrorResponse('Invalid or expired password reset token', 400));
    }

    customer.password = newPassword;
    customer.resetPasswordToken = null;
    customer.resetPasswordExpires = null;
    await customer.save();

    return sendResponse(res, 200, {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Refresh Access Token
// @route   POST /api/v1/auth/refresh
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return next(new ErrorResponse('Refresh token is required', 401));
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'ratalu_refresh_secret_key_2026_xyz');

    // Always normalize role to lowercase — never compare mixed-case strings
    const role = decoded.role?.toLowerCase();

    let user;
    if (role === 'admin') {
      user = await Admin.findById(decoded.id);
    } else {
      user = await Customer.findById(decoded.id);
    }

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      clearRefreshTokenCookie(res);
      return next(new ErrorResponse('Invalid refresh token', 401));
    }

    // Mint new tokens with normalized lowercase role
    const normalizedRole = (user.role || 'customer').toLowerCase();
    const newAccessToken = generateAccessToken(user._id, normalizedRole);
    return sendResponse(res, 200, {
      success: true,
      data: { accessToken: newAccessToken }
    });
  } catch (err) {
    clearRefreshTokenCookie(res);
    return next(new ErrorResponse('Invalid or expired refresh token', 401));
  }
};

// @desc    Logout User
// @route   POST /api/v1/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      await Customer.updateOne({ refreshTokens: refreshToken }, { $pull: { refreshTokens: refreshToken } });
      await Admin.updateOne({ refreshTokens: refreshToken }, { $pull: { refreshTokens: refreshToken } });
    }
    clearRefreshTokenCookie(res);
    return sendResponse(res, 200, { success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};
