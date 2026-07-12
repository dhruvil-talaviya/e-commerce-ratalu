const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');

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
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If Customer token
    if (decoded.role === 'Customer') {
      const customer = await Customer.findById(decoded.id);
      if (!customer) {
        return next(new ErrorResponse('User account no longer exists', 401));
      }
      if (customer.status === 'Blocked') {
        return next(new ErrorResponse('Your account has been suspended. Please contact support.', 403));
      }
      req.user = customer;
      req.user.role = 'Customer'; // Ensure role is set
    } else {
      // Admin/Manager/Super Admin token
      const admin = await Admin.findById(decoded.id);
      if (!admin) {
        return next(new ErrorResponse('Admin session not found', 401));
      }
      req.user = admin; // Contains role: 'Super Admin', 'Admin', 'Manager'
    }

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

// Grant access to specific roles (RBAC)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user ? req.user.role : 'Guest'} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
