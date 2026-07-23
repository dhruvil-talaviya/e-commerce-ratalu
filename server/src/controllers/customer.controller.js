const Customer = require('../models/Customer');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

/** Escape user input before it reaches a RegExp. */
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Aggregate lifetime spend + order count for a set of customers. */
const getSpendMap = async (customerIds) => {
  const rows = await Order.aggregate([
    { $match: { customerId: { $in: customerIds }, status: { $nin: ['Pending', 'Payment Failed', 'Expired', 'Cancelled'] } } },
    {
      $group: {
        _id: '$customerId',
        totalOrders: { $sum: 1 },
        lifetimeSpend: { $sum: '$totals.total' },
        lastOrderAt: { $max: '$createdAt' }
      }
    }
  ]);
  return rows.reduce((acc, r) => {
    acc[String(r._id)] = r;
    return acc;
  }, {});
};

// @desc    List customers (search + filter + pagination)
// @route   GET /api/v1/admin/customers
// @access  Private (Admin)
exports.getCustomers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.status && ['Active', 'Blocked'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    if (req.query.search) {
      const rx = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      query.$or = [{ name: rx }, { phone: rx }, { email: rx }];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .select('-refreshTokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query)
    ]);

    // Enrich with order stats.
    const spend = await getSpendMap(customers.map((c) => c._id));
    const data = customers.map((c) => ({
      ...c,
      profileComplete: Boolean(c.name && c.name.trim()),
      totalOrders: spend[String(c._id)]?.totalOrders || 0,
      lifetimeSpend: spend[String(c._id)]?.lifetimeSpend || 0,
      lastOrderAt: spend[String(c._id)]?.lastOrderAt || null
    }));

    sendResponse(res, 200, {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer summary counters for the admin dashboard
// @route   GET /api/v1/admin/customers/stats
// @access  Private (Admin)
exports.getCustomerStats = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, active, blocked, newCustomers] = await Promise.all([
      Customer.countDocuments({}),
      Customer.countDocuments({ status: 'Active' }),
      Customer.countDocuments({ status: 'Blocked' }),
      Customer.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ]);

    sendResponse(res, 200, {
      success: true,
      data: { total, active, blocked, newCustomers, window: '30d' }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Full customer profile + order history + activity timeline
// @route   GET /api/v1/admin/customers/:id
// @access  Private (Admin)
exports.getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).select('-refreshTokens').lean();
    if (!customer) {
      return next(new ErrorResponse('Customer not found', 404));
    }

    const Notification = require('../models/Notification');
    const ActivityLog = require('../models/ActivityLog');

    const [orders, notifications, logs] = await Promise.all([
      Order.find({ customerId: customer._id }).sort({ createdAt: -1 }).lean(),
      Notification.find({ customerId: customer._id }).sort({ createdAt: -1 }).lean(),
      ActivityLog.find({ customerId: customer._id }).sort({ timestamp: -1 }).lean()
    ]);

    const successfulOrders = orders.filter((o) => !['Pending', 'Payment Failed', 'Expired', 'Cancelled'].includes(o.status));
    const totalOrdersCount = successfulOrders.length;
    const lifetimeSpend = successfulOrders.reduce((sum, o) => sum + (o.totals?.total || 0), 0);
    const avgOrderValue = totalOrdersCount ? Math.round(lifetimeSpend / totalOrdersCount) : 0;

    // Activity timeline, newest first.
    const activity = [
      { type: 'account', label: 'Account created', at: customer.createdAt },
      ...orders.map((o) => ({
        type: 'order',
        label: `Order #${o.displayId || o.id} — ${o.status} (₹${o.totals?.total})`,
        at: o.createdAt,
        orderId: o.id
      })),
      ...notifications.map((n) => ({
        type: 'notification',
        label: `${n.title}: ${n.message}`,
        at: n.createdAt
      })),
      ...logs.map((l) => ({
        type: 'activity',
        label: `${l.action.charAt(0).toUpperCase() + l.action.slice(1)}${l.details ? `: ${l.details}` : ''}`,
        at: l.timestamp
      }))
    ].sort((a, b) => new Date(b.at || b.timestamp) - new Date(a.at || a.timestamp));

    sendResponse(res, 200, {
      success: true,
      data: {
        ...customer,
        profileComplete: Boolean(customer.name && customer.name.trim()),
        stats: {
          totalOrders: totalOrdersCount,
          lifetimeSpend,
          avgOrderValue,
          lastOrderAt: successfulOrders[0]?.createdAt || null,
          couponsUsed: (customer.couponsUsed || []).length
        },
        orders,
        activity
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a customer (admin)
// @route   PUT /api/v1/admin/customers/:id
// @access  Private (Admin)
exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new ErrorResponse('Customer not found', 404));
    }

    const { name, email, phone, notes } = req.body;

    if (phone && phone !== customer.phone) {
      if (!/^\d{10}$/.test(String(phone))) {
        return next(new ErrorResponse('Phone must be 10 digits', 400));
      }
      const dupe = await Customer.findOne({ phone, _id: { $ne: customer._id } });
      if (dupe) {
        return next(new ErrorResponse('Another account already uses that mobile number', 400));
      }
      customer.phone = phone;
    }

    if (email !== undefined) {
      const trimmed = String(email).trim().toLowerCase();
      if (trimmed) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return next(new ErrorResponse('Please provide a valid email address', 400));
        }
        const taken = await Customer.findOne({ email: trimmed, _id: { $ne: customer._id } });
        if (taken) {
          return next(new ErrorResponse('Another account already uses that email', 400));
        }
      }
      customer.email = trimmed || undefined;
    }

    if (name !== undefined) customer.name = String(name).trim();
    if (notes !== undefined) customer.notes = String(notes);

    await customer.save();

    await AuditLog.create({
      user: req.user?.username || 'Admin',
      role: req.user?.role || 'Admin',
      action: `Updated customer profile: ${customer.phone}`,
      ipAddress: req.ip || '127.0.0.1'
    }).catch(() => {});

    sendResponse(res, 200, {
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Block / unblock a customer
// @route   PATCH /api/v1/admin/customers/:id/status
// @access  Private (Admin)
exports.setCustomerStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Blocked'].includes(status)) {
      return next(new ErrorResponse("Status must be either 'Active' or 'Blocked'", 400));
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new ErrorResponse('Customer not found', 404));
    }

    customer.status = status;
    // Blocking must kill any live session immediately.
    if (status === 'Blocked') {
      customer.refreshTokens = [];
    }
    await customer.save();

    await AuditLog.create({
      user: req.user?.username || 'Admin',
      role: req.user?.role || 'Admin',
      action: `${status === 'Blocked' ? 'Blocked' : 'Unblocked'} customer: ${customer.phone}`,
      ipAddress: req.ip || '127.0.0.1'
    }).catch(() => {});

    sendResponse(res, 200, {
      success: true,
      message: `Customer ${status === 'Blocked' ? 'blocked' : 'activated'} successfully`,
      data: { id: customer._id, status: customer.status }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a customer
// @route   DELETE /api/v1/admin/customers/:id
// @access  Private (Admin)
exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new ErrorResponse('Customer not found', 404));
    }

    // Refuse to orphan order history — block instead.
    const orderCount = await Order.countDocuments({ customerId: customer._id });
    if (orderCount > 0) {
      return next(new ErrorResponse(
        `This customer has ${orderCount} order(s) and cannot be deleted. Block them instead to preserve order history.`,
        409
      ));
    }

    await customer.deleteOne();

    await AuditLog.create({
      user: req.user?.username || 'Admin',
      role: req.user?.role || 'Admin',
      action: `Deleted customer: ${customer.phone}`,
      ipAddress: req.ip || '127.0.0.1'
    }).catch(() => {});

    sendResponse(res, 200, {
      success: true,
      message: 'Customer deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export customers as CSV
// @route   GET /api/v1/admin/customers/export
// @access  Private (Admin)
exports.exportCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find({}).select('-refreshTokens').sort({ createdAt: -1 }).lean();
    const spend = await getSpendMap(customers.map((c) => c._id));

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Name', 'Phone', 'Email', 'Status', 'Addresses', 'Total Orders', 'Lifetime Spend', 'Joined'];
    const rows = customers.map((c) => [
      esc(c.name),
      esc(c.phone),
      esc(c.email),
      esc(c.status),
      esc((c.addresses || []).length),
      esc(spend[String(c._id)]?.totalOrders || 0),
      esc(spend[String(c._id)]?.lifetimeSpend || 0),
      esc(new Date(c.createdAt).toISOString().slice(0, 10))
    ].join(','));

    const csv = [header.map(esc).join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
