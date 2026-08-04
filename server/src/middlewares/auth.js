const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'ratalu_jwt_secret_key_2026_production_xyz';

// Protect routes - Verify JWT and attach user
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Always normalize to lowercase — never compare mixed-case strings
    const userRole = String(decoded.role || '').toLowerCase();

    if (userRole === 'customer') {
      const customer = await Customer.findById(decoded.id);
      if (!customer) {
        return next(new ErrorResponse('User account no longer exists', 401));
      }
      if (customer.status === 'Blocked') {
        return next(new ErrorResponse('Your account has been suspended. Please contact support.', 403));
      }
      req.user = customer;
      req.user.role = 'customer';
    } else {
      const admin = await Admin.findById(decoded.id);
      if (!admin) {
        return next(new ErrorResponse('Admin session not found', 401));
      }
      req.user = admin;
      req.user.role = 'admin'; // always lowercase — single source of truth
    }

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

const softAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();

  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);

    if (String(decoded.role || '').toLowerCase() === 'customer') {
      const customer = await Customer.findById(decoded.id);
      if (customer && customer.status !== 'Blocked') {
        req.user = customer;
        req.user.role = 'customer';
      }
    }
  } catch {
    // Guest
  }

  next();
};

const authorize = (...roles) => {
  // Normalize all allowed roles to lowercase once
  const allowedRoles = roles.map(r => String(r).toLowerCase().trim());
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    // Normalize current user role to lowercase
    const currentRole = String(req.user.role || '').toLowerCase().trim();

    // Any admin role passes any admin-targeted route
    const isAdminUser = currentRole === 'admin';
    const isAdminRoute = allowedRoles.some(r => r === 'admin' || r === 'super_admin' || r === 'manager');

    if (isAdminUser && isAdminRoute) {
      return next();
    }

    if (!allowedRoles.includes(currentRole)) {
      return next(
        new ErrorResponse(
          'Access forbidden. Insufficient permissions.',
          403
        )
      );
    }
    next();
  };
};

module.exports = {
  protect,
  softAuth,
  authorize
};
