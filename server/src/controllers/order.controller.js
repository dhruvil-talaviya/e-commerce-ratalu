const Order = require('../models/Order');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const StockHistory = require('../models/StockHistory');
const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

// GST & Shipping constants matching frontend
const GST_RATE = 0.05;
const FREE_SHIPPING_THRESHOLD = 599;
const FLAT_SHIPPING_FEE = 49;

// Helper to update stock levels
const updateStockLevels = async (items, type, orderId, note) => {
  for (const item of items) {
    const { flavorId, packId, quantity } = item;

    // 1. Update Product catalog stock level
    const product = await Product.findOne({ flavorId });
    if (product) {
      const pack = product.packs.find(p => p.id === packId);
      if (pack) {
        if (type === 'Out') {
          pack.stock = Math.max(pack.stock - quantity, 0);
        } else {
          pack.stock = pack.stock + quantity;
        }
        await product.save();
      }
    }

    // 2. Update Inventory record
    const inv = await Inventory.findOne({ flavorId, packId });
    if (inv) {
      if (type === 'Out') {
        inv.currentStock = Math.max(inv.currentStock - quantity, 0);
      } else {
        inv.currentStock = inv.currentStock + quantity;
      }
      await inv.save();
    }

    // 3. Write Stock History movement log
    await StockHistory.create({
      flavorId,
      packId,
      type,
      quantity,
      referenceId: orderId,
      note
    });
  }
};

// @desc    Perform Checkout Totals Validation
// @route   POST /api/v1/orders/checkout/validate
// @access  Public
exports.validateCheckout = async (req, res, next) => {
  try {
    const { items, couponCode } = req.body;

    if (!items || items.length === 0) {
      return next(new ErrorResponse('Cart items required for validation', 400));
    }

    let subtotal = 0;
    const validatedItems = [];

    // Verify current prices
    for (const item of items) {
      const product = await Product.findOne({ flavorId: item.flavorId });
      if (!product) {
        return next(new ErrorResponse(`Product not found for flavor: ${item.flavorId}`, 404));
      }
      const pack = product.packs.find(p => p.id === item.packId);
      if (!pack) {
        return next(new ErrorResponse(`Pack size ${item.packId} not found for flavor: ${item.flavorId}`, 404));
      }
      
      // Stock verification
      if (pack.stock < item.quantity) {
        return next(new ErrorResponse(`Insufficient stock for ${item.flavorName} (${item.packLabel})`, 400));
      }

      const itemTotal = pack.price * item.quantity;
      subtotal += itemTotal;
      validatedItems.push({
        ...item,
        unitPrice: pack.price
      });
    }

    // Process Coupon
    let discount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), status: 'Active' });
      if (coupon) {
        if (!coupon.minSubtotal || subtotal >= coupon.minSubtotal) {
          discount = coupon.type === 'percent'
            ? Math.round((subtotal * coupon.value) / 100)
            : Math.min(coupon.value, subtotal);
        }
      }
    }

    const taxedBase = Math.max(subtotal - discount, 0);
    const gst = Math.round(taxedBase * GST_RATE);
    const qualifiesFreeShipping = taxedBase >= FREE_SHIPPING_THRESHOLD;
    const shipping = subtotal === 0 || qualifiesFreeShipping ? 0 : FLAT_SHIPPING_FEE;
    const total = taxedBase + gst + shipping;

    sendResponse(res, 200, {
      success: true,
      data: {
        subtotal,
        discount,
        gst,
        shipping,
        total,
        qualifiesFreeShipping
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Place Order
// @route   POST /api/v1/orders
// @access  Private (or Guest checkout support if user is not logged in)
exports.createOrder = async (req, res, next) => {
  try {
    const { items, couponCode, address, method } = req.body;

    if (!items || items.length === 0) {
      return next(new ErrorResponse('Cannot place an order with empty cart', 400));
    }

    // Verify & Calculate
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOne({ flavorId: item.flavorId });
      if (!product) {
        return next(new ErrorResponse(`Flavor ${item.flavorId} no longer exists`, 404));
      }
      const pack = product.packs.find(p => p.id === item.packId);
      if (!pack) {
        return next(new ErrorResponse(`Pack ${item.packId} no longer exists`, 404));
      }
      if (pack.stock < item.quantity) {
        return next(new ErrorResponse(`Pack ${item.packLabel} of flavor ${item.flavorName} is out of stock`, 400));
      }

      subtotal += pack.price * item.quantity;
      orderItems.push({
        flavorId: item.flavorId,
        flavorName: item.flavorName,
        packId: item.packId,
        packLabel: item.packLabel,
        grams: pack.grams,
        unitPrice: pack.price,
        quantity: item.quantity,
        gradient: item.gradient
      });
    }

    let discount = 0;
    let couponRecord = null;
    if (couponCode) {
      couponRecord = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), status: 'Active' });
      if (couponRecord) {
        if (!couponRecord.minSubtotal || subtotal >= couponRecord.minSubtotal) {
          discount = couponRecord.type === 'percent'
            ? Math.round((subtotal * couponRecord.value) / 100)
            : Math.min(couponRecord.value, subtotal);
          
          // Increment coupon usage
          couponRecord.usageCount += 1;
          await couponRecord.save();
        }
      }
    }

    const taxedBase = Math.max(subtotal - discount, 0);
    const gst = Math.round(taxedBase * GST_RATE);
    const qualifiesFreeShipping = taxedBase >= FREE_SHIPPING_THRESHOLD;
    const shipping = subtotal === 0 || qualifiesFreeShipping ? 0 : FLAT_SHIPPING_FEE;
    const total = taxedBase + gst + shipping;

    // Generate Order ID: e.g. RW4B7A82
    const orderId = 'RW' + Math.random().toString(36).slice(2, 8).toUpperCase();

    const orderPayload = {
      id: orderId,
      userName: req.user ? req.user.name : req.body.userName || 'Guest User',
      userPhone: req.user ? req.user.phone : req.body.userPhone,
      items: orderItems,
      totals: {
        subtotal,
        discount,
        gst,
        shipping,
        total
      },
      address: {
        tag: address.tag || 'Home',
        addressLine: address.addressLine,
        city: address.city,
        state: address.state,
        pincode: address.pincode
      },
      method: method || 'UPI',
      status: 'Pending'
    };

    if (req.user) {
      orderPayload.customerId = req.user._id;
    }

    const order = await Order.create(orderPayload);

    // Decrement stock & record history
    await updateStockLevels(orderItems, 'Out', orderId, 'Customer order checkout placement.');

    // Clear DB cart if customer logged in
    if (req.user) {
      const cart = await Cart.findOne({ customerId: req.user._id });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    }

    sendResponse(res, 201, {
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get orders for current customer
// @route   GET /api/v1/orders/my
// @access  Private
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customerId: req.user._id }).sort({ createdAt: -1 });
    sendResponse(res, 200, {
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Order Details
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrderDetails = async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.id });
    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Access check: must be owner or Admin
    if (req.user.role === 'Customer' && order.customerId && order.customerId.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Unauthorized access to this order details', 403));
    }

    sendResponse(res, 200, {
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel Order by Customer
// @route   POST /api/v1/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.id });
    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    if (req.user.role === 'Customer' && order.customerId.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Unauthorized cancellation request', 403));
    }

    if (order.status !== 'Pending' && order.status !== 'Confirmed') {
      return next(new ErrorResponse('Order cannot be cancelled at its current status stage', 400));
    }

    order.status = 'Cancelled';
    order.timeline.push({
      status: 'Cancelled',
      time: new Date(),
      note: 'Order cancelled by customer.'
    });
    await order.save();

    // Revert Stock
    await updateStockLevels(order.items, 'In', order.id, 'Customer cancellation stock restoration.');

    sendResponse(res, 200, {
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Query All Orders
// @route   GET /api/v1/admin/orders
// @access  Private (Admin only)
exports.getAdminOrders = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { id: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userPhone: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const totalRecords = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    sendResponse(res, 200, {
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Update Status of Order
// @route   PUT /api/v1/admin/orders/:id/status
// @access  Private (Admin only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    const oldStatus = order.status;
    order.status = status;
    order.timeline.push({
      status,
      time: new Date(),
      note: note || `Status updated by store administrator from ${oldStatus} to ${status}.`
    });

    await order.save();

    // If cancelled or refund approved, restore stock levels
    if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
      await updateStockLevels(order.items, 'In', order.id, 'Admin cancellation stock restoration.');
    }

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role || 'Admin',
      action: `Modified Order #${order.id} status to: ${status}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Assign Courier Info
// @route   PUT /api/v1/admin/orders/:id/courier
// @access  Private (Admin only)
exports.assignCourier = async (req, res, next) => {
  try {
    const { courierName, trackingNumber } = req.body;
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    order.courierName = courierName;
    order.trackingNumber = trackingNumber;
    order.status = 'Ready for Dispatch';
    order.timeline.push({
      status: 'Ready for Dispatch',
      time: new Date(),
      note: `Courier allocated: ${courierName} (AWB: ${trackingNumber})`
    });

    await order.save();

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role || 'Admin',
      action: `Assigned courier info on Order #${order.id}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Courier tracking information assigned',
      data: order
    });
  } catch (error) {
    next(error);
  }
};
