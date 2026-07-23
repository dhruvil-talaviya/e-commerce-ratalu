const Order = require('../models/Order');
const Product = require('../models/Product');
const Flavor = require('../models/Flavor');
const Inventory = require('../models/Inventory');
const StockHistory = require('../models/StockHistory');
const Coupon = require('../models/Coupon');
const Customer = require('../models/Customer');
const Cart = require('../models/Cart');
const AuditLog = require('../models/AuditLog');
const Counter = require('../models/Counter');
const Settings = require('../models/Settings');
const Combo = require('../models/Combo');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

const getComboDiscounts = async (items) => {
  try {
    const now = new Date();
    const combos = await Combo.find({
      status: 'Active',
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }
      ]
    });

    if (!combos || combos.length === 0) return { discount: 0, appliedCombos: [] };

    /**
     * Live unit prices, straight from the validated cart (already priced against
     * the catalogue moments ago), plus the pool of quantities to consume.
     */
    const unitPrice = {};
    const pool = {};
    items.forEach(item => {
      const key = `${item.flavorId}:${item.packId}`;
      pool[key] = (pool[key] || 0) + item.quantity;
      unitPrice[key] = item.unitPrice;
    });

    /**
     * What one application of this bundle costs at TODAY's prices.
     *
     * This used to discount by `combo.savings`, which is derived from
     * `originalPrice` — a snapshot taken when the combo was saved. Once any pack
     * price moved, that snapshot went stale and the customer was charged
     * (live subtotal − stale savings) instead of the `comboPrice` the combo card
     * promised them. Pricing the bundle live means the discount is exactly the
     * gap to `comboPrice`, so the advertised price is the price they pay.
     */
    const liveBundlePrice = (combo) =>
      combo.items.reduce((sum, i) => {
        const p = unitPrice[`${i.flavorId}:${i.packId}`];
        return p === undefined ? NaN : sum + p * i.quantity;
      }, 0);

    let totalDiscount = 0;
    const appliedCombos = [];

    // Best real-money saving first, so overlapping bundles resolve in the
    // customer's favour. Bundles that no longer beat buying separately are
    // dropped rather than applied as a negative "discount".
    const sortedCombos = combos
      .map((combo) => ({ combo, live: liveBundlePrice(combo) }))
      .filter(({ combo, live }) => Number.isFinite(live) && live > combo.comboPrice)
      .sort((a, b) => (b.live - b.combo.comboPrice) - (a.live - a.combo.comboPrice));

    for (const { combo, live } of sortedCombos) {
      let possibleApplications = Infinity;
      for (const reqItem of combo.items) {
        const key = `${reqItem.flavorId}:${reqItem.packId}`;
        const available = pool[key] || 0;
        const needed = reqItem.quantity;
        if (needed <= 0) continue;
        const count = Math.floor(available / needed);
        if (count < possibleApplications) {
          possibleApplications = count;
        }
      }

      if (possibleApplications > 0 && possibleApplications !== Infinity) {
        for (const reqItem of combo.items) {
          const key = `${reqItem.flavorId}:${reqItem.packId}`;
          pool[key] -= reqItem.quantity * possibleApplications;
        }
        const savings = Math.round((live - combo.comboPrice) * possibleApplications);
        totalDiscount += savings;
        appliedCombos.push({
          comboId: combo._id,
          name: combo.name,
          count: possibleApplications,
          discount: savings
        });
      }
    }

    return { discount: totalDiscount, appliedCombos };
  } catch (error) {
    console.error('Error calculating combo discounts:', error);
    return { discount: 0, appliedCombos: [] };
  }
};
const { notify, notifyOrderStatus, notifyAdmin } = require('../utils/notify');
const { assertWithinLimits } = require('../services/limits.service');
const { assertEligible, checkEligibility } = require('../services/coupon.service');
const { assertTransition, nextStatuses, REQUIRES_COURIER, FULFILMENT_FLOW } = require('../services/fulfilment.service');

// GST & Shipping constants matching frontend
const GST_RATE = 0.05;
const FREE_SHIPPING_THRESHOLD = 599;
const FLAT_SHIPPING_FEE = 49;

/**
 * Neutralise regex metacharacters in admin search input.
 * Without this, a search for "a+b" or "(" is either a wrong query or an
 * expensive backtracking pattern run against every order.
 */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper to update stock levels
const updateStockLevels = async (items, type, orderId, note, options = {}) => {
  const settings = await Settings.findOne({}, null, options) || { lowStockThreshold: 10, inventoryEnabled: false };
  if (!settings.inventoryEnabled) {
    return; // Skip modifying stock if the inventory module is disabled.
  }
  const threshold = settings.lowStockThreshold || 10;

  for (const item of items) {
    const { flavorId, packId, quantity, flavorName, packLabel } = item;

    // 1. Update Product catalog stock level
    const product = await Product.findOne({ flavorId }, null, options);
    if (product) {
      const pack = product.packs.find(p => p.id === packId);
      if (pack) {
        if (type === 'Out') {
          pack.stock = Math.max(pack.stock - quantity, 0);
        } else {
          pack.stock = pack.stock + quantity;
        }
        await product.save(options);
      }
    }

    // 2. Update Inventory record
    const inv = await Inventory.findOne({ flavorId, packId }, null, options);
    if (inv) {
      const oldStock = inv.currentStock;
      if (type === 'Out') {
        inv.currentStock = Math.max(inv.currentStock - quantity, 0);
      } else {
        inv.currentStock = inv.currentStock + quantity;
      }
      await inv.save(options);

      // Trigger stock alerts if stock decreased
      if (type === 'Out' && inv.currentStock < oldStock) {
        const name = flavorName || inv.flavorName || flavorId;
        const label = packLabel || inv.packLabel || packId;

        if (inv.currentStock === 0) {
          await notifyAdmin({
            title: 'Out of Stock Alert',
            message: `Product ${name} (${label}) is completely out of stock!`,
            type: 'General'
          });
        } else if (inv.currentStock <= threshold && oldStock > threshold) {
          await notifyAdmin({
            title: 'Low Stock Alert',
            message: `Product ${name} (${label}) is low on stock (${inv.currentStock} remaining).`,
            type: 'General'
          });
        }
      }
    }

    // 3. Write Stock History movement log
    await StockHistory.create([{
      flavorId,
      packId,
      type,
      quantity,
      referenceId: orderId,
      note
    }], options);

    // Notify Admin of Inventory Update
    await notifyAdmin({
      title: 'Inventory Updated',
      message: `Stock level for flavor ${flavorId} (${packId}) updated to ${inv ? inv.currentStock : 'unknown'} (${type} by ${quantity}).`,
      type: 'General'
    });
  }
};

const createAutoRefundForCancelledOrder = async (order, initiator, options = {}) => {
  try {
    if (order.payment && order.payment.status === 'Paid') {
      const mongoose = require('mongoose');
      const Refund = mongoose.model('Refund');
      const refundService = require('../services/refund.service');
      
      const existingRefund = await Refund.findOne({ orderId: order.id }, null, options);
      if (!existingRefund) {
        const refundId = await refundService.nextRefundId();
        await Refund.create([{
          refundId,
          orderId: order.id,
          customerId: order.customerId,
          customerName: order.userName,
          customerPhone: order.userPhone,
          orderTotal: order.totals.total,
          type: 'Refund',
          reason: 'Duplicate Order', // Default reason
          description: `Order cancelled by ${initiator}. Automatically generated refund request.`,
          items: order.items.map(item => ({
            flavorId: item.flavorId,
            flavorName: item.flavorName,
            packId: item.packId,
            packLabel: item.packLabel,
            unitPrice: item.unitPrice,
            quantity: item.quantity
          })),
          requestedAmount: order.totals.total,
          customerNotes: `Order cancelled by ${initiator}.`,
          razorpayPaymentId: order.payment.transactionId || '',
          razorpayOrderId: order.payment.gatewayOrderId || '',
          timeline: [{
            status: 'Submitted',
            note: `Order cancelled by ${initiator}. Automatically generated refund request.`,
            by: initiator === 'customer' ? 'customer' : 'admin',
            at: new Date()
          }]
        }], options);
      }
    }
  } catch (err) {
    console.error('Failed to auto-create refund for cancelled order:', err);
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

    let rawSubtotal = 0;
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
        return next(new ErrorResponse(`Insufficient stock for ${item.flavorName || item.packLabel} (${item.packLabel})`, 400));
      }

      rawSubtotal += pack.price * item.quantity;
      validatedItems.push({
        ...item,
        unitPrice: pack.price
      });
    }

    const settings = (await Settings.findOne()) || {
      gstEnabled: true,
      taxRate: 5,
      taxInclusive: true,
      shippingFreeThreshold: 599,
      shippingFlatRate: 49
    };

    const gstEnabled = settings.gstEnabled !== false;
    const globalGstRate = settings.taxRate || 5;
    const globalTaxInclusive = settings.taxInclusive !== false;
    const freeShippingThreshold = settings.shippingFreeThreshold || 599;
    const flatShippingFee = settings.shippingFlatRate || 49;

    /**
     * Coupon — quoted through the SAME service that will gate the real payment.
     *
     * This endpoint used to run its own reduced copy of the rules (min-spend
     * only), so it would happily quote a discount for an expired, exhausted, or
     * already-used code and let checkout be the one to break the news.
     */
    let discount = 0;
    let couponError = null;

    // Calculate Combo discounts first
    const comboInfo = await getComboDiscounts(validatedItems);
    const comboDiscount = comboInfo.discount;
    discount += comboDiscount;

    if (couponCode) {
      const result = await checkEligibility({
        code: couponCode,
        customer: req.user,
        subtotal: Math.max(rawSubtotal - comboDiscount, 0)
      });

      if (result.eligible) {
        discount += result.discount;
      } else {
        couponError = result.reason;
      }
    }

    const discountRatio = rawSubtotal > 0 ? Math.max(rawSubtotal - discount, 0) / rawSubtotal : 0;

    let totalTaxableBase = 0;
    let totalOriginalGst = 0;

    for (const item of validatedItems) {
      const flavorDoc = await Flavor.findOne({ slug: item.flavorId });
      let rate = 0;
      let isInclusive = true;

      if (gstEnabled) {
        if (flavorDoc && flavorDoc.taxOverrideEnabled) {
          rate = flavorDoc.taxRate || 0;
          isInclusive = flavorDoc.taxInclusive !== false;
        } else {
          rate = globalGstRate;
          isInclusive = globalTaxInclusive;
        }
      }

      const itemOriginalTotal = item.unitPrice * item.quantity;
      let baseVal = 0;
      let gstVal = 0;

      if (isInclusive) {
        baseVal = itemOriginalTotal / (1 + rate / 100);
        gstVal = itemOriginalTotal - baseVal;
      } else {
        baseVal = itemOriginalTotal;
        gstVal = itemOriginalTotal * (rate / 100);
      }

      totalTaxableBase += baseVal;
      totalOriginalGst += gstVal;
    }

    const gst = Math.round(totalOriginalGst * discountRatio);
    const postDiscountPrice = Math.max(rawSubtotal - discount, 0);
    const qualifiesFreeShipping = postDiscountPrice >= freeShippingThreshold;
    const shipping = rawSubtotal === 0 ? 0 : (qualifiesFreeShipping ? 0 : flatShippingFee);

    let total = 0;
    let taxedBase = 0;

    // Check if all items in checkout are inclusive-taxed
    let allInclusive = true;
    for (const item of validatedItems) {
      const flavorDoc = await Flavor.findOne({ slug: item.flavorId });
      if (gstEnabled) {
        if (flavorDoc && flavorDoc.taxOverrideEnabled) {
          if (flavorDoc.taxInclusive === false) allInclusive = false;
        } else if (globalTaxInclusive === false) {
          allInclusive = false;
        }
      }
    }

    if (allInclusive) {
      total = postDiscountPrice + shipping;
      taxedBase = postDiscountPrice - gst;
    } else {
      total = postDiscountPrice + gst + shipping;
      taxedBase = postDiscountPrice;
    }

    if (settings.roundOffEnabled !== false) {
      total = Math.round(total);
    }

    sendResponse(res, 200, {
      success: true,
      data: {
        subtotal: rawSubtotal,
        discount,
        gst: gstEnabled ? gst : 0,
        shipping,
        total,
        qualifiesFreeShipping,
        // Present only when a code was sent and refused — the cart shows this
        // instead of pretending the discount applied.
        couponError
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Place Order
// @route   POST /api/v1/orders
// @access  Private (or Guest checkout support if user is not logged in)
/**
 * Core order placement — shared by the direct /orders endpoint and the
 * payment flow (/payment/create-order).
 *
 * Validates every line against the LIVE catalogue, recomputes all totals
 * server-side (the client's prices are never trusted), validates the coupon,
 * persists the order, decrements stock and clears the cart.
 *
 * @returns {Promise<Object>} the created Order document
 */
exports.placeOrder = async ({ user, items, couponCode, address, method, paymentMethod }) => {
  if (!user) {
    throw new ErrorResponse('You must be signed in to place an order', 401);
  }
  if (!items || items.length === 0) {
    throw new ErrorResponse('Cannot place an order with empty cart', 400);
  }
  if (!address || !address.addressLine || !address.city || !address.state || !address.pincode) {
    throw new ErrorResponse('A complete delivery address is required', 400);
  }

  const ALLOWED_METHODS = ['COD', 'Razorpay', 'UPI', 'Card', 'Wallet'];
  const payMethod = ALLOWED_METHODS.includes(paymentMethod) ? paymentMethod : 'COD';

  /**
   * 0. Purchase limits.
   *
   * This is the gate that was missing. The limits lived only in the React cart
   * provider, so a request straight to this endpoint ignored them — a 50-pack
   * order was placed against a 20-pack store limit and a 10-pack product limit,
   * and it consumed real stock. Checked here, before anything is reserved.
   */
  await assertWithinLimits(items);

  // 1. Validate each line item against the catalogue + available stock.
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findOne({ flavorId: item.flavorId });
    if (!product) {
      throw new ErrorResponse(`Flavor ${item.flavorId} no longer exists`, 404);
    }
    const pack = product.packs.find(p => p.id === item.packId);
    if (!pack) {
      throw new ErrorResponse(`Pack ${item.packId} no longer exists`, 404);
    }
    const qty = Math.max(parseInt(item.quantity, 10) || 0, 0);
    if (qty < 1) {
      throw new ErrorResponse('Each line item needs a quantity of at least 1', 400);
    }

    // Resolve the display name from the catalogue — never trust the client
    // for names/labels any more than we trust it for prices.
    const flavorDoc = await Flavor.findOne({ slug: item.flavorId });
    const flavorName = flavorDoc?.name || item.flavorName;
    if (!flavorName) {
      throw new ErrorResponse(`Unknown flavour: ${item.flavorId}`, 400);
    }

    /**
     * Availability flag — the admin's "Out of stock" switch. It blocks buying
     * on its own, independent of pack quantities, so a product can be taken off
     * sale without zeroing its stock. Enforced here too, not just in the UI, so
     * no request can order something the store has marked unavailable.
     */
    if (flavorDoc && flavorDoc.inStock === false) {
      throw new ErrorResponse(`${flavorName} is currently out of stock`, 400);
    }

    if (pack.stock < qty) {
      throw new ErrorResponse(`${flavorName} (${pack.label}) is out of stock`, 400);
    }

    subtotal += pack.price * qty;
    orderItems.push({
      flavorId: item.flavorId,
      flavorName,                 // from catalogue
      packId: item.packId,
      packLabel: pack.label,      // from catalogue
      grams: pack.grams,
      unitPrice: pack.price,      // server-side price, never the client's
      quantity: qty,
      gradient: item.gradient
    });
  }

  const settings = (await Settings.findOne()) || {
    gstEnabled: true,
    taxRate: 5,
    taxInclusive: true,
    shippingFreeThreshold: 599,
    shippingFlatRate: 49,
    businessState: 'Maharashtra'
  };

  const gstEnabled = settings.gstEnabled !== false;
  const globalGstRate = settings.taxRate || 5;
  const globalTaxInclusive = settings.taxInclusive !== false;
  const freeShippingThreshold = settings.shippingFreeThreshold || 599;
  const flatShippingFee = settings.shippingFlatRate || 49;

  /**
   * 2. Coupon — one shared eligibility check.
   *
   * Every rule (expiry, global cap, minimum spend, per-account limit, first
   * order only) lives in coupon.service, so the code that validates a coupon in
   * the cart and the code that honours it at payment can never disagree.
   */
  let discount = 0;
  let couponRecord = null;

  // Calculate Combo discounts first
  const comboInfo = await getComboDiscounts(orderItems);
  const comboDiscount = comboInfo.discount;
  discount += comboDiscount;

  if (couponCode) {
    const result = await assertEligible({
      code: couponCode,
      customer: user,
      subtotal: Math.max(subtotal - comboDiscount, 0)
    });
    couponRecord = result.coupon;
    discount += result.discount;
  }

  // 3. Totals — always recomputed here.
  let totalTaxableBase = 0;
  let totalOriginalGst = 0;

  for (const item of orderItems) {
    const flavorDoc = await Flavor.findOne({ slug: item.flavorId });
    let rate = 0;
    let isInclusive = true;

    if (gstEnabled) {
      if (flavorDoc && flavorDoc.taxOverrideEnabled) {
        rate = flavorDoc.taxRate || 0;
        isInclusive = flavorDoc.taxInclusive !== false;
      } else {
        rate = globalGstRate;
        isInclusive = globalTaxInclusive;
      }
    }

    const itemOriginalTotal = item.unitPrice * item.quantity;
    let baseVal = 0;
    let gstVal = 0;

    if (isInclusive) {
      baseVal = itemOriginalTotal / (1 + rate / 100);
      gstVal = itemOriginalTotal - baseVal;
    } else {
      baseVal = itemOriginalTotal;
      gstVal = itemOriginalTotal * (rate / 100);
    }

    totalTaxableBase += baseVal;
    totalOriginalGst += gstVal;
  }

  const discountRatio = subtotal > 0 ? Math.max(subtotal - discount, 0) / subtotal : 0;
  const gst = Math.round(totalOriginalGst * discountRatio);
  const postDiscountPrice = Math.max(subtotal - discount, 0);

  // Intrastate vs Interstate split
  const orderState = (address.state || '').trim().toLowerCase();
  const storeState = (settings.businessState || 'Maharashtra').trim().toLowerCase();
  const isSameState = orderState === storeState;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (gstEnabled) {
    if (isSameState) {
      cgst = gst / 2;
      sgst = gst / 2;
    } else {
      igst = gst;
    }
  }

  const qualifiesFreeShipping = postDiscountPrice >= freeShippingThreshold;
  let shipping = subtotal === 0 || qualifiesFreeShipping ? 0 : flatShippingFee;
  
  // Dynamic distance shipping fee calculation if GPS coordinates are available
  if (address && address.latitude && address.longitude) {
    const hubLat = 21.1702;
    const hubLon = 72.8311;
    const R = 6371; // km
    const dLat = ((address.latitude - hubLat) * Math.PI) / 180;
    const dLon = ((address.longitude - hubLon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((hubLat * Math.PI) / 180) *
        Math.cos((address.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Hyper-local delivery rules (e.g. Surat):
    // Within 10km, shipping is free!
    if (distance <= 10) {
      shipping = 0;
    } else if (distance > 50) {
      shipping = 150; // out-of-town long distance fee
    }
  }

  let total = 0;
  let taxedBase = 0;

  let allInclusive = true;
  for (const item of orderItems) {
    const flavorDoc = await Flavor.findOne({ slug: item.flavorId });
    if (gstEnabled) {
      if (flavorDoc && flavorDoc.taxOverrideEnabled) {
        if (flavorDoc.taxInclusive === false) allInclusive = false;
      } else if (globalTaxInclusive === false) {
        allInclusive = false;
      }
    }
  }

  if (allInclusive) {
    total = postDiscountPrice + shipping;
    taxedBase = postDiscountPrice - gst;
  } else {
    total = postDiscountPrice + gst + shipping;
    taxedBase = postDiscountPrice;
  }

  if (settings.roundOffEnabled !== false) {
    total = Math.round(total);
  }

  // Invoice Number Generation sequence
  let nextInvSeq = await Counter.next('invoiceNumber');
  if (settings.invoiceStartNumber && nextInvSeq < settings.invoiceStartNumber) {
    await Counter.findByIdAndUpdate('invoiceNumber', { seq: settings.invoiceStartNumber });
    nextInvSeq = settings.invoiceStartNumber;
  }
  const invoiceNumber = `${settings.invoicePrefix || 'INV-'}${nextInvSeq}/${settings.financialYear || '2026-27'}`;

  const orderId = 'RW' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const orderNumber = await Counter.next('orderNumber');

  const order = await Order.create({
    id: orderId,
    orderNumber,
    customerId: user._id,
    // Recorded so per-account redemption limits have something exact to count.
    couponCode: couponRecord ? couponRecord.code : '',
    userName: user.name || 'Customer',
    userPhone: user.phone,
    items: orderItems,
    totals: {
      subtotal,
      discount,
      gst: gstEnabled ? gst : 0,
      shipping,
      total,
      gstEnabled,
      cgst,
      sgst,
      igst,
      gstNumber: settings.gstNumber || '',
      businessName: settings.businessName || '',
      businessAddress: settings.businessAddress || '',
      panNumber: settings.panNumber || '',
      state: settings.businessState || ''
    },
    address: {
      tag: address.tag || 'Home',
      addressLine: address.addressLine,
      city: address.city,
      state: address.state,
      pincode: address.pincode
    },
    method: method || payMethod,
    payment: { method: payMethod, status: 'Pending' },
    status: 'Pending',
    invoiceNumber
  });

  // 4. Decrement stock (+ StockHistory audit trail).
  await updateStockLevels(orderItems, 'Out', orderId, 'Customer order checkout placement.');

  /**
   * 5. Record the redemption.
   *
   * `order.couponCode` (set above) is the source of truth for per-account limits.
   * The global counter is bumped atomically — `save()` on a doc read minutes ago
   * would clobber concurrent redemptions and let a capped coupon overshoot.
   * `couponsUsed` is kept only because the customer export still reads it.
   */
  if (couponRecord && discount > 0) {
    await Coupon.updateOne({ _id: couponRecord._id }, { $inc: { usageCount: 1 } });
    await Customer.updateOne(
      { _id: user._id },
      { $addToSet: { couponsUsed: couponRecord.code } }
    );
  }

  // 6. Clear the server-side cart.
  const cart = await Cart.findOne({ customerId: user._id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  // 7. Tell the customer we have it.
  await notify(user._id, {
    title: `Order ${order.displayId} placed`,
    message: `We've received your order ${order.displayId} for ₹${Math.round(total).toLocaleString('en-IN')}. You can cancel it within ${Order.CANCEL_WINDOW_MINUTES} minutes.`,
    type: 'OrderStatus'
  });

  // Notify Admin
  await notifyAdmin({
    title: 'New Order Received',
    message: `Order ${order.displayId || order.id} has been placed by ${order.userName} for ₹${Math.round(total).toLocaleString('en-IN')}.`,
    type: 'OrderStatus'
  });

  return order;
};

// @desc    Place an order directly (used for COD / legacy clients)
// @route   POST /api/v1/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const { items, couponCode, address, method, paymentMethod } = req.body;

    const order = await exports.placeOrder({
      user: req.user,
      items,
      couponCode,
      address,
      method,
      paymentMethod: paymentMethod || method
    });

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

    const Refund = require('mongoose').model('Refund');
    const refunds = await Refund.find({ orderId: order.id }).lean();

    const orderObj = order.toObject();
    orderObj.refunds = refunds || [];

    sendResponse(res, 200, {
      success: true,
      data: orderObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel Order by Customer
// @route   POST /api/v1/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
  const mongoose = require('mongoose');

  const executeCancel = async (session) => {
    const options = session ? { session } : {};
    
    const orderQuery = Order.findOne({ id: req.params.id });
    if (session) orderQuery.session(session);
    const order = await orderQuery;
    
    if (!order) {
      throw new ErrorResponse('Order not found', 404);
    }

    const settingsQuery = Settings.findOne({});
    if (session) settingsQuery.session(session);
    const settings = await settingsQuery || {};
    
    const isCustomer = req.user.role === 'Customer';

    if (isCustomer) {
      if (order.customerId && order.customerId.toString() !== req.user._id.toString()) {
        throw new ErrorResponse('Unauthorized cancellation request', 403);
      }

      // Allowed customer statuses
      const allowedStatuses = ['Pending', 'Confirmed'];
      if (settings.allowCustomerCancellationInPreparing) {
        allowedStatuses.push('Preparing');
      }

      if (!allowedStatuses.includes(order.status)) {
        throw new ErrorResponse(`Cancellation is not allowed after the order has entered the "${order.status}" stage.`, 400);
      }

      // Window validation
      const windowMinutes = Order.CANCEL_WINDOW_MINUTES || 5;
      const ageMinutes = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
      if (ageMinutes > windowMinutes) {
        throw new ErrorResponse(
          `The ${windowMinutes}-minute cancellation window for this order has closed. Please contact support.`,
          400
        );
      }
    } else {
      // Admin cancellation rules
      const forbiddenStatuses = ['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];
      if (forbiddenStatuses.includes(order.status)) {
        throw new ErrorResponse(`Administrators cannot cancel an order that is already "${order.status}".`, 400);
      }
    }

    const previousStatus = order.status;
    order.status = 'Cancelled';
    order.cancelledBy = isCustomer ? 'customer' : 'admin';
    order.cancelledAt = new Date();
    order.cancelReason = isCustomer ? 'Customer self-cancellation' : (req.body.reason || 'Admin cancellation');
    order.timeline.push({
      status: 'Cancelled',
      time: new Date(),
      note: isCustomer ? 'Order cancelled by customer.' : 'Order cancelled by admin.'
    });
    await order.save(options);

    await createAutoRefundForCancelledOrder(order, isCustomer ? 'customer' : 'admin', options);

    // Revert Stock
    await updateStockLevels(
      order.items,
      'In',
      order.id,
      isCustomer ? 'Customer cancellation stock restoration.' : 'Admin cancellation stock restoration.',
      options
    );

    // Audit log
    await AuditLog.create([{
      user: req.user.username || req.user.phone || 'Customer',
      role: req.user.role,
      action: 'Cancel Order',
      previousValue: previousStatus,
      newValue: 'Cancelled',
      reason: isCustomer ? 'Customer self-cancellation' : 'Admin cancellation',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      device: req.headers['user-agent'] || 'Unknown Device',
      apiEndpoint: req.originalUrl,
      correlationId: req.headers['x-correlation-id'] || ''
    }], options);

    return order;
  };

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const order = await executeCancel(session);
    await session.commitTransaction();
    session.endSession();

    // Trigger async notifications after commit
    await notifyOrderStatus(order, 'Cancelled').catch(() => {});
    await notifyAdmin({
      title: 'Order Cancelled',
      message: `Order ${order.displayId || order.id} has been cancelled by ${req.user.role === 'Customer' ? 'customer' : 'admin'}.`,
      type: 'OrderStatus'
    }).catch(() => {});

    sendResponse(res, 200, {
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    if (error.message && error.message.includes('replica set')) {
      console.warn('MongoDB transaction not supported (standalone instance). Retrying without transaction session.');
      try {
        const order = await executeCancel(null);
        await notifyOrderStatus(order, 'Cancelled').catch(() => {});
        await notifyAdmin({
          title: 'Order Cancelled',
          message: `Order ${order.displayId || order.id} has been cancelled by ${req.user.role === 'Customer' ? 'customer' : 'admin'}.`,
          type: 'OrderStatus'
        }).catch(() => {});
        return sendResponse(res, 200, {
          success: true,
          message: 'Order cancelled successfully (standalone mode)',
          data: order
        });
      } catch (retryError) {
        return next(retryError);
      }
    }

    next(error);
  }
};

// @desc    Admin Query All Orders
// @route   GET /api/v1/admin/orders
// @access  Private (Admin only)
/** Columns the admin table is allowed to sort by (whitelist — never trust the client). */
const ORDER_SORT_FIELDS = {
  createdAt: 'createdAt',
  orderNumber: 'orderNumber',
  total: 'totals.total',
  status: 'status',
  userName: 'userName'
};

exports.getAdminOrders = async (req, res, next) => {
  try {
    const {
      search,
      status,
      paymentMethod,
      paymentStatus,
      partner,
      city,
      state,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 25
    } = req.query;

    const filter = {};

    // Multi-select support: ?status=Pending&status=Confirmed OR ?status=Pending,Confirmed
    const asList = (value) => {
      if (!value) return null;
      const list = Array.isArray(value) ? value : String(value).split(',');
      const cleaned = list.map((v) => v.trim()).filter(Boolean);
      return cleaned.length ? cleaned : null;
    };

    const statuses = asList(status);
    if (statuses) filter.status = { $in: statuses };

    const methods = asList(paymentMethod);
    if (methods) filter['payment.method'] = { $in: methods };

    const payStatuses = asList(paymentStatus);
    if (payStatuses) filter['payment.status'] = { $in: payStatuses };

    const partners = asList(partner);
    if (partners) filter.courierName = { $in: partners };

    if (city) filter['address.city'] = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
    if (state) filter['address.state'] = { $regex: `^${escapeRegex(state)}$`, $options: 'i' };

    const dateRangeFilter = req.query.dateFilter || req.query.filter;
    if (dateRangeFilter && dateRangeFilter !== 'allTime') {
      const { resolveDateRange } = require('../utils/date');
      const resolved = resolveDateRange(dateRangeFilter);
      if (resolved.start || resolved.end) {
        filter.createdAt = {};
        if (resolved.start) filter.createdAt.$gte = resolved.start;
        if (resolved.end) filter.createdAt.$lte = resolved.end;
      }
    } else if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const start = new Date(dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00.000+05:30`);
        filter.createdAt.$gte = isNaN(start.getTime()) ? new Date(dateFrom) : start;
      }
      if (dateTo) {
        const end = new Date(dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59.999+05:30`);
        filter.createdAt.$lte = isNaN(end.getTime()) ? new Date(dateTo) : end;
      }
    }

    if (minAmount || maxAmount) {
      filter['totals.total'] = {};
      if (minAmount) filter['totals.total'].$gte = Number(minAmount);
      if (maxAmount) filter['totals.total'].$lte = Number(maxAmount);
    }

    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      filter.$or = [
        { id: rx },
        { userName: rx },
        { userPhone: rx },
        { invoiceNumber: rx },
        { trackingNumber: rx },
        { 'address.city': rx }
      ];
      // Let the admin search by the running number too ("148" -> RW-000148).
      const asNumber = Number(String(search).replace(/\D/g, ''));
      if (Number.isFinite(asNumber) && asNumber > 0) {
        filter.$or.push({ orderNumber: asNumber });
      }
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const sortField = ORDER_SORT_FIELDS[sortBy] || 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [orders, totalRecords] = await Promise.all([
      Order.find(filter).sort(sort).skip(skip).limit(limitNum),
      Order.countDocuments(filter)
    ]);

    sendResponse(res, 200, {
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalRecords / limitNum) || 1,
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
  const mongoose = require('mongoose');

  const executeUpdate = async (session) => {
    const options = session ? { session } : {};
    const { status, note, internalNotes, customerNotes, paymentStatus } = req.body;
    
    const orderQuery = Order.findOne({ id: req.params.id });
    if (session) orderQuery.session(session);
    const order = await orderQuery;

    if (!order) {
      throw new ErrorResponse('Order not found', 404);
    }

    const oldStatus = order.status;
    let isOverrideTransition = false;

    if (status) {
      const { validateStatusTransition } = require('../services/fulfilment.service');
      const validation = validateStatusTransition(oldStatus, status, req.user.role, note);
      isOverrideTransition = validation.isOverride;

      if (status === REQUIRES_COURIER && !order.trackingNumber) {
        throw new ErrorResponse(
          'Assign a courier and tracking number before dispatching this order.',
          400
        );
      }

      order.status = status;
      order.timeline.push({
        status,
        time: new Date(),
        note: note || `Status updated by store administrator from ${oldStatus} to ${status}.`
      });

      if (status === 'Delivered' && order.payment?.method === 'COD' && order.payment.status !== 'Paid') {
        order.payment.status = 'Paid';
        order.payment.paidAt = new Date();
      }
    }

    if (internalNotes !== undefined) {
      order.internalNotes = internalNotes;
    }

    if (customerNotes !== undefined) {
      order.customerNotes = customerNotes;
    }

    if (paymentStatus !== undefined) {
      if (!order.payment) {
        order.payment = { method: 'COD', status: 'Pending' };
      }
      order.payment.status = paymentStatus;
      if (paymentStatus === 'Refunded') {
        order.payment.refundedAt = new Date();
      } else if (paymentStatus === 'Paid') {
        order.payment.paidAt = new Date();
      }
    }

    await order.save(options);

    // If cancelled or refund approved/completed, restore stock levels
    if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
      order.cancelledBy = 'admin';
      order.cancelledAt = new Date();
      order.cancelReason = note || 'Admin cancellation';
      await order.save(options);
      await updateStockLevels(order.items, 'In', order.id, 'Admin cancellation stock restoration.', options);
      await createAutoRefundForCancelledOrder(order, 'admin', options);
    }

    // Write audit log
    await AuditLog.create([{
      user: req.user.username || req.user.phone || 'Admin',
      role: req.user.role || 'Admin',
      action: isOverrideTransition ? 'Override Status' : 'Update Status',
      previousValue: oldStatus,
      newValue: status || oldStatus,
      reason: note || (isOverrideTransition ? 'Manual Super Admin override' : 'Normal status update'),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      device: req.headers['user-agent'] || 'Unknown Device',
      apiEndpoint: req.originalUrl,
      correlationId: req.headers['x-correlation-id'] || ''
    }], options);

    return { order, oldStatus, status };
  };

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await executeUpdate(session);
    await session.commitTransaction();
    session.endSession();

    // Trigger async operations after commit
    if (result.status && result.status !== result.oldStatus) {
      await notifyOrderStatus(result.order, result.status).catch(() => {});
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Order updated successfully',
      data: result.order
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    if (error.message && error.message.includes('replica set')) {
      console.warn('MongoDB transaction not supported (standalone instance). Retrying without transaction session.');
      try {
        const result = await executeUpdate(null);
        if (result.status && result.status !== result.oldStatus) {
          await notifyOrderStatus(result.order, result.status).catch(() => {});
        }
        return sendResponse(res, 200, {
          success: true,
          message: 'Order updated successfully (standalone mode)',
          data: result.order
        });
      } catch (retryError) {
        return next(retryError);
      }
    }

    next(error);
  }
};

// @desc    Admin Assign Courier Info
// @route   PUT /api/v1/admin/orders/:id/courier
// @access  Private (Admin only)
/**
 * Dispatch: hand the parcel to a courier and move the order on.
 *
 * This endpoint could never have worked. It set `status = 'Ready for Dispatch'`
 * — a value that is not in the Order status enum — so every call ended in a
 * Mongoose ValidationError. Nothing in the console called it either, which is
 * why no order has ever carried a courier or a tracking number.
 */
exports.assignCourier = async (req, res, next) => {
  try {
    const courierName = String(req.body.courierName || '').trim();
    const trackingNumber = String(req.body.trackingNumber || '').trim();

    if (!courierName || !trackingNumber) {
      return next(
        new ErrorResponse('A courier name and tracking number are both required.', 400)
      );
    }

    const order = await Order.findOne({ id: req.params.id });
    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Dispatching is a real move through the lifecycle, subject to the same
    // rules as any other — you cannot dispatch something already delivered.
    const alreadyDispatched = Boolean(order.trackingNumber);
    if (!alreadyDispatched) {
      assertTransition(order.status, REQUIRES_COURIER);
    }

    order.courierName = courierName;
    order.trackingNumber = trackingNumber;

    if (alreadyDispatched) {
      // Correcting the details of an existing dispatch — don't re-run the status.
      order.timeline.push({
        status: order.status,
        time: new Date(),
        note: `Courier details updated: ${courierName} (AWB: ${trackingNumber})`
      });
    } else {
      order.status = REQUIRES_COURIER;
      order.timeline.push({
        status: REQUIRES_COURIER,
        time: new Date(),
        note: `Dispatched with ${courierName} (AWB: ${trackingNumber})`
      });
    }

    await order.save();

    if (!alreadyDispatched) {
      await notifyOrderStatus(order, order.status);
    }

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role || 'Admin',
      action: `Assigned courier ${courierName} (AWB ${trackingNumber}) to Order #${order.id}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: alreadyDispatched ? 'Courier details updated' : 'Order dispatched',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — BULK ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Statuses that release reserved stock back to inventory when entered. */
const STOCK_RESTORING_STATUSES = ['Cancelled', 'Returned', 'Refund Completed'];

// @desc    Update the status of many orders at once
// @route   POST /api/v1/admin/orders/bulk/status
// @access  Private (Admin)
exports.bulkUpdateOrderStatus = async (req, res, next) => {
  const mongoose = require('mongoose');

  const executeBulkUpdate = async (session) => {
    const options = session ? { session } : {};
    const { ids, status, note } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ErrorResponse('Select at least one order', 400);
    }
    if (!status) {
      throw new ErrorResponse('A target status is required', 400);
    }
    if (!Order.schema.path('status').enumValues.includes(status)) {
      throw new ErrorResponse(`"${status}" is not a valid order status`, 400);
    }

    const ordersQuery = Order.find({ id: { $in: ids } });
    if (session) ordersQuery.session(session);
    const orders = await ordersQuery;

    const updated = [];
    const skipped = [];
    const asyncNotifications = [];

    for (const order of orders) {
      if (order.status === status) {
        skipped.push({ id: order.id, reason: 'Already in that status' });
        continue;
      }

      const { validateStatusTransition } = require('../services/fulfilment.service');
      try {
        validateStatusTransition(order.status, status, req.user.role, note);
      } catch (err) {
        skipped.push({ id: order.id, reason: err.message });
        continue;
      }

      if (status === REQUIRES_COURIER && !order.trackingNumber) {
        skipped.push({ id: order.id, reason: 'Needs a courier and tracking number first' });
        continue;
      }

      const previous = order.status;
      order.status = status;
      order.timeline.push({
        status,
        time: new Date(),
        note: note || `Bulk update by administrator from ${previous} to ${status}.`
      });
      await order.save(options);

      if (status === 'Cancelled' && previous !== 'Cancelled') {
        await createAutoRefundForCancelledOrder(order, 'admin', options);
      }

      // Returning stock is not idempotent — only do it on the transition in.
      if (STOCK_RESTORING_STATUSES.includes(status) && !STOCK_RESTORING_STATUSES.includes(previous)) {
        await updateStockLevels(order.items, 'In', order.id, `Stock restored: order ${status.toLowerCase()}.`, options);
      }

      asyncNotifications.push(order);
      updated.push(order.id);
    }

    if (updated.length > 0) {
      await AuditLog.create([{
        user: req.user.username || req.user.phone || 'Admin',
        role: req.user.role || 'Admin',
        action: `Bulk Update Status to ${status}`,
        previousValue: `Count: ${updated.length} orders`,
        newValue: status,
        reason: note || 'Bulk status update',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown Device',
        apiEndpoint: req.originalUrl,
        correlationId: req.headers['x-correlation-id'] || ''
      }], options);
    }

    return { updated, skipped, asyncNotifications };
  };

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await executeBulkUpdate(session);
    await session.commitTransaction();
    session.endSession();

    // Trigger async operations after commit
    for (const order of result.asyncNotifications) {
      await notifyOrderStatus(order, req.body.status).catch(() => {});
    }

    sendResponse(res, 200, {
      success: true,
      message: `${result.updated.length} order(s) updated to ${req.body.status}`,
      data: { updated: result.updated, skipped: result.skipped }
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    if (error.message && error.message.includes('replica set')) {
      console.warn('MongoDB transaction not supported (standalone instance). Retrying without transaction session.');
      try {
        const result = await executeBulkUpdate(null);
        for (const order of result.asyncNotifications) {
          await notifyOrderStatus(order, req.body.status).catch(() => {});
        }
        return sendResponse(res, 200, {
          success: true,
          message: `${result.updated.length} order(s) updated to ${req.body.status} (standalone mode)`,
          data: { updated: result.updated, skipped: result.skipped }
        });
      } catch (retryError) {
        return next(retryError);
      }
    }

    next(error);
  }
};

// @desc    Delete many orders at once
// @route   POST /api/v1/admin/orders/bulk/delete
// @access  Private (Admin)
exports.bulkDeleteOrders = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return next(new ErrorResponse('Select at least one order', 400));
    }

    const result = await Order.deleteMany({ id: { $in: ids } });

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role,
      action: `Deleted ${result.deletedCount} order(s): ${ids.join(', ')}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: `${result.deletedCount} order(s) deleted`,
      data: { deleted: result.deletedCount }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Distinct values to populate the admin filter dropdowns
// @route   GET /api/v1/admin/orders/filters
// @access  Private (Admin)
exports.getOrderFilterOptions = async (req, res, next) => {
  try {
    const [cities, states, methods, partners] = await Promise.all([
      Order.distinct('address.city'),
      Order.distinct('address.state'),
      Order.distinct('payment.method'),
      Order.distinct('courierName')
    ]);

    sendResponse(res, 200, {
      success: true,
      data: {
        statuses: Order.schema.path('status').enumValues,
        paymentStatuses: ['Pending', 'Paid', 'Failed', 'Refunded'],
        paymentMethods: methods.filter(Boolean).sort(),
        partners: partners.filter(Boolean).sort(),
        cities: cities.filter(Boolean).sort(),
        states: states.filter(Boolean).sort()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download a single order's invoice as a PDF
// @route   GET /api/v1/admin/orders/:id/invoice
// @access  Private (Admin)
exports.getOrderInvoice = async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.id });
    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    const settings = (await Settings.findOne().lean()) || {};
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 48, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${order.displayId || order.id}.pdf"`
    );
    doc.pipe(res);

    const rupees = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
    const PURPLE = '#5B2C83';

    // ── Header ────────────────────────────────────────────────────────────────
    const sellerName = settings.storeName || order.totals?.businessName || settings.businessName || 'Ratalu Wafers';
    const sellerAddress = settings.businessAddress || order.totals?.businessAddress || '';
    const sellerGst = settings.gstNumber || order.totals?.gstNumber || '';
    const sellerPan = settings.panNumber || order.totals?.panNumber || '';

    doc.fontSize(22).fillColor(PURPLE).font('Helvetica-Bold')
      .text(sellerName, 48, 48, { width: 300 });
    
    let topY = doc.y;
    doc.fontSize(8.5).fillColor('#6B7280').font('Helvetica');
    if (sellerAddress) doc.text(sellerAddress, 48, topY, { width: 280 });
    topY = doc.y + 2;
    if (sellerGst) doc.text(`GSTIN: ${sellerGst}`, 48, topY);
    topY = doc.y + 1;
    if (sellerPan) doc.text(`PAN: ${sellerPan}`, 48, topY);

    // Right Column — Tax Invoice details
    doc.fontSize(18).fillColor('#111827').font('Helvetica-Bold')
      .text('TAX INVOICE', 320, 48, { align: 'right', width: 228 });
    
    doc.fontSize(8.5).fillColor('#4B5563').font('Helvetica')
      .text(`Invoice No: ${order.invoiceNumber || '-'}`, 320, 72, { align: 'right', width: 228 })
      .text(`Order ID: ${order.displayId || order.id}`, 320, 85, { align: 'right', width: 228 })
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 320, 98, { align: 'right', width: 228 })
      .text(`Status: ${order.status}`, 320, 111, { align: 'right', width: 228 });

    // Accent line
    const headerBottomY = Math.max(doc.y + 12, 140);
    doc.moveTo(48, headerBottomY).lineTo(doc.page.width - 48, headerBottomY)
      .lineWidth(1).strokeColor(PURPLE).stroke();

    // ── Bill to Card ──────────────────────────────────────────────────────────
    const billToY = headerBottomY + 14;
    doc.roundedRect(48, billToY, doc.page.width - 96, 68, 6)
      .fillAndStroke('#F9FAFB', '#E5E7EB');

    doc.fontSize(8).fillColor(PURPLE).font('Helvetica-Bold')
      .text('BILL TO (CUSTOMER)', 60, billToY + 8);

    doc.fontSize(10).fillColor('#111827').font('Helvetica-Bold')
      .text(order.userName || 'Customer', 60, billToY + 20);

    doc.fontSize(8.5).fillColor('#4B5563').font('Helvetica')
      .text(`Mobile: +91 ${order.userPhone || '—'}`, 60, billToY + 34)
      .text(
        [order.address?.addressLine, order.address?.city, order.address?.state, order.address?.pincode]
          .filter(Boolean).join(', '),
        60,
        billToY + 47,
        { width: doc.page.width - 120, height: 16, ellipsis: true }
      );

    // ── Items table ───────────────────────────────────────────────────────────
    const left = 48;
    const width = doc.page.width - 96;
    const cols = [width * 0.48, width * 0.12, width * 0.18, width * 0.22];
    let y = billToY + 84;

    doc.rect(left, y, width, 22).fill(PURPLE);
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
    doc.text('Item Description', left + 8, y + 6, { width: cols[0] - 16 });
    doc.text('Qty', left + cols[0], y + 6, { width: cols[1], align: 'right' });
    doc.text('Rate', left + cols[0] + cols[1], y + 6, { width: cols[2], align: 'right' });
    doc.text('Amount', left + cols[0] + cols[1] + cols[2], y + 6, { width: cols[3] - 8, align: 'right' });
    y += 22;

    doc.font('Helvetica').fontSize(8.5);
    (order.items || []).forEach((item, i) => {
      if (y > doc.page.height - 180) { doc.addPage(); y = 48; }
      doc.rect(left, y, width, 20).fillAndStroke(i % 2 ? '#FFFFFF' : '#F8FAFC', '#E5E7EB');
      doc.fillColor('#111827');
      doc.text(`${item.flavorName} (${item.packLabel})`, left + 8, y + 5, { width: cols[0] - 16, ellipsis: true });
      doc.text(String(item.quantity), left + cols[0], y + 5, { width: cols[1], align: 'right' });
      doc.text(rupees(item.unitPrice), left + cols[0] + cols[1], y + 5, { width: cols[2], align: 'right' });
      doc.text(rupees(item.unitPrice * item.quantity), left + cols[0] + cols[1] + cols[2], y + 5, { width: cols[3] - 8, align: 'right' });
      y += 20;
    });

    // ── Totals ────────────────────────────────────────────────────────────────
    y += 12;
    const row = (label, value, bold) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 8.5);
      doc.fillColor(bold ? '#111827' : '#6B7280');
      doc.text(label, left + width * 0.5, y, { width: width * 0.26, align: 'right' });
      doc.fillColor(bold ? PURPLE : '#111827');
      doc.text(value, left + width * 0.76, y, { width: width * 0.24 - 8, align: 'right' });
      y += bold ? 20 : 15;
    };

    const orderGst = order.totals?.gst || 0;
    const gstEnabled = order.totals?.gstEnabled !== false && orderGst > 0;
    const cgst = order.totals?.cgst ?? 0;
    const sgst = order.totals?.sgst ?? 0;
    const igst = order.totals?.igst ?? 0;

    row('Subtotal', rupees(order.totals?.subtotal));
    if (order.totals?.discount > 0) row('Discount', `- ${rupees(order.totals.discount)}`);
    
    if (gstEnabled) {
      if (cgst > 0 || sgst > 0) {
        row('CGST', rupees(cgst));
        row('SGST', rupees(sgst));
      } else if (igst > 0) {
        row('IGST', rupees(igst));
      } else {
        row('GST', rupees(orderGst));
      }
    }

    row('Shipping Fee', order.totals?.shipping ? rupees(order.totals.shipping) : 'Free');
    y += 4;
    doc.moveTo(left + width * 0.5, y).lineTo(left + width, y).strokeColor('#E5E7EB').stroke();
    y += 8;
    row('Total Amount', rupees(order.totals?.total), true);

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 70;
    doc.moveTo(left, footerY - 10).lineTo(left + width, footerY - 10)
      .lineWidth(0.5).strokeColor('#E5E7EB').stroke();

    doc.fontSize(8).fillColor('#6B7280').font('Helvetica')
      .text(
        `Payment Method: ${order.payment?.method || order.method || '-'}  •  Status: ${order.payment?.status || 'Pending'}`,
        left,
        footerY
      )
      .text('Thank you for shopping with us! This is a computer-generated tax invoice.', left, footerY + 12);

    doc.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Download delivery labels (name / phone / address) as a printable PDF
// @route   GET /api/v1/admin/orders/labels?ids=RW-000023,RW-000022
// @access  Private (Admin)
exports.getOrderLabels = async (req, res, next) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return next(new ErrorResponse('Select at least one order to print labels for.', 400));
    }

    const found = await Order.find({ id: { $in: ids } });
    const byId = new Map(found.map((o) => [o.id, o]));
    const orders = ids.map((id) => byId.get(id)).filter(Boolean);

    if (orders.length === 0) {
      return next(new ErrorResponse('No matching orders found.', 404));
    }

    const settings = (await Settings.findOne().lean()) || {};
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 0, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="delivery-labels-${orders.length}-order${orders.length === 1 ? '' : 's'}.pdf"`
    );
    doc.pipe(res);

    const PURPLE = '#5B2C83';
    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN = 20;
    const COLS = 2;
    const ROWS = 2;
    const PER_PAGE = COLS * ROWS;
    const CELL_W = (PAGE_W - MARGIN * 2) / COLS;
    const CELL_H = (PAGE_H - MARGIN * 2) / ROWS;
    const PAD = 14;

    const storeName = settings.storeName || settings.businessName || 'Ratalu Wafers';
    const storeAddress = settings.businessAddress || '';

    orders.forEach((order, i) => {
      const slot = i % PER_PAGE;
      if (i > 0 && slot === 0) doc.addPage();

      const x = MARGIN + (slot % COLS) * CELL_W;
      const y = MARGIN + Math.floor(slot / COLS) * CELL_H;
      const innerW = CELL_W - PAD * 2;

      // Cut border
      doc.roundedRect(x + 4, y + 4, CELL_W - 8, CELL_H - 8, 6)
        .lineWidth(0.8)
        .strokeColor('#D1D5DB')
        .dash(3, { space: 2 })
        .stroke()
        .undash();

      let cursor = y + PAD + 4;

      // ── From ────────────────────────────────────────────────────────────
      doc.fontSize(7).fillColor('#9CA3AF').font('Helvetica-Bold').text('FROM', x + PAD, cursor);
      cursor += 9;
      doc.fontSize(10).fillColor(PURPLE).font('Helvetica-Bold').text(storeName, x + PAD, cursor, { width: innerW });
      cursor += 12;
      if (storeAddress) {
        doc.fontSize(7.5).fillColor('#6B7280').font('Helvetica')
          .text(storeAddress, x + PAD, cursor, { width: innerW, height: 18, ellipsis: true });
        cursor += 16;
      }

      doc.moveTo(x + PAD, cursor).lineTo(x + CELL_W - PAD, cursor)
        .lineWidth(0.5).strokeColor('#E5E7EB').stroke();
      cursor += 10;

      // ── Ship to — the recipient ─────────────────────────────────────────
      doc.fontSize(7).fillColor('#9CA3AF').font('Helvetica-Bold').text('SHIP TO', x + PAD, cursor);
      cursor += 11;

      doc.fontSize(14).fillColor('#111827').font('Helvetica-Bold')
        .text(order.userName || '—', x + PAD, cursor, { width: innerW, height: 34, ellipsis: true });
      cursor = doc.y + 2;

      doc.fontSize(11).fillColor('#111827').font('Helvetica-Bold')
        .text(`+91 ${order.userPhone || '—'}`, x + PAD, cursor, { width: innerW });
      cursor = doc.y + 5;

      const a = order.address || {};
      doc.fontSize(9.5).fillColor('#374151').font('Helvetica')
        .text(a.addressLine || '—', x + PAD, cursor, { width: innerW, height: 46, ellipsis: true });
      cursor = doc.y + 2;

      doc.fontSize(9.5).fillColor('#374151').font('Helvetica')
        .text(`${a.city || ''}${a.city && a.state ? ', ' : ''}${a.state || ''}`, x + PAD, cursor, { width: innerW });
      cursor = doc.y + 2;

      doc.fontSize(13).fillColor('#111827').font('Helvetica-Bold')
        .text(`PIN ${a.pincode || '—'}`, x + PAD, cursor, { width: innerW });

      // ── Footer: order id + what to collect ──────────────────────────────
      const footY = y + CELL_H - PAD - 26;
      doc.moveTo(x + PAD, footY - 8).lineTo(x + CELL_W - PAD, footY - 8)
        .lineWidth(0.5).strokeColor('#E5E7EB').stroke();

      doc.fontSize(10).fillColor('#111827').font('Helvetica-Bold')
        .text(order.displayId || order.id, x + PAD, footY, { width: innerW * 0.5 });

      const isCod = order.payment?.method === 'COD';
      const unpaid = order.payment?.status !== 'Paid';
      const collect = isCod && unpaid;

      doc.fontSize(collect ? 11 : 8)
        .fillColor(collect ? '#B91C1C' : '#059669')
        .font('Helvetica-Bold')
        .text(
          collect
            ? `COLLECT Rs. ${Number(order.totals?.total || 0).toLocaleString('en-IN')}`
            : 'PREPAID - DO NOT COLLECT',
          x + PAD + innerW * 0.5,
          footY,
          { width: innerW * 0.5, align: 'right' }
        );
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};
