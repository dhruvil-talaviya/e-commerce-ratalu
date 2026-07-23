const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  flavorId: { type: String, required: true },
  flavorName: { type: String, required: true },
  packId: { type: String, required: true },
  packLabel: { type: String, required: true },
  grams: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  gradient: {
    from: { type: String },
    via: { type: String },
    to: { type: String }
  }
});

const OrderTimelineSchema = new mongoose.Schema({
  status: { type: String, required: true },
  time: { type: Date, default: Date.now },
  note: { type: String }
});

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g., RW104A

  /**
   * Human-facing running number, assigned from the atomic `orderNumber`
   * counter. `id` stays the API/lookup key so every existing route keeps
   * working; this is purely what the customer reads and quotes to support.
   * Sparse: orders created before this field existed have no number.
   */
  orderNumber: { type: Number, unique: true, sparse: true },

  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  userName: { type: String, required: true },
  userPhone: { type: String, required: true },
  items: [OrderItemSchema],
  totals: {
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    gst: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true },
    gstEnabled: { type: Boolean, default: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    gstNumber: { type: String, default: '' },
    businessName: { type: String, default: '' },
    businessAddress: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    state: { type: String, default: '' }
  },
  address: {
    tag: { type: String },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  // Legacy free-text method — retained for backward compatibility.
  method: { type: String, required: true },

  /**
   * Authoritative payment state for this order. The append-only gateway
   * audit trail lives in the separate `Payment` collection.
   */
  payment: {
    method: {
      type: String,
      enum: ['COD', 'Razorpay', 'UPI', 'Card', 'Wallet'],
      default: 'COD'
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded', 'Cancelled'],
      default: 'Pending'
    },
    transactionId: { type: String },   // gateway payment id
    gatewayOrderId: { type: String },  // gateway order id
    paidAt: { type: Date },
    refundedAt: { type: Date }
  },

  status: {
    type: String,
    enum: [
      'Pending',
      'Confirmed',
      'Preparing',
      'Packed',
      'Ready to Ship',
      'Assigned to Logistics',
      'Shipped',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
      'Returned',
      'Refund Requested',
      'Refund Approved',
      'Refund Completed',
      'Payment Failed',
      'Expired'
    ],
    default: 'Pending'
  },
  /**
   * Which coupon paid for the discount on this order.
   *
   * Was not recorded at all, which meant per-account redemption limits had
   * nothing exact to count — the only trace was a flag on the customer, so
   * "usable twice" or "first order only" could not be enforced or audited.
   */
  couponCode: { type: String, default: '', index: true },

  timeline: [OrderTimelineSchema],
  invoiceNumber: { type: String },
  courierName: { type: String },
  trackingNumber: { type: String },
  customerNotes: { type: String },
  internalNotes: { type: String },

  // ─── Structured Cancellation Fields ─────────────────────────────────────────
  /** Who cancelled: 'customer' | 'admin'. Null when not cancelled. */
  cancelledBy: {
    type: String,
    enum: ['customer', 'admin'],
    default: null,
    index: true
  },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: '' }
}, { timestamps: true });

// Auto-populate invoiceNumber and timeline on create
OrderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.timeline.push({
      status: this.status,
      time: new Date(),
      note: 'Order placed by customer.'
    });
    this.invoiceNumber = 'INV-' + this.id;
  }
  next();
});

/** How long after checkout a customer may still cancel, in minutes. */
OrderSchema.statics.CANCEL_WINDOW_MINUTES = 5;

/** Zero-padded running number the customer sees, e.g. "RW-000148". */
OrderSchema.virtual('displayId').get(function () {
  return this.orderNumber
    ? `RW-${String(this.orderNumber).padStart(6, '0')}`
    : this.id;
});

/** Instant the cancellation window closes (null once the order has moved on). */
OrderSchema.virtual('cancellableUntil').get(function () {
  if (this.status !== 'Pending' && this.status !== 'Confirmed') return null;
  const created = this.createdAt || this._id.getTimestamp();
  const windowMs = (OrderSchema.statics.CANCEL_WINDOW_MINUTES || 5) * 60 * 1000;
  return new Date(created.getTime() + windowMs);
});

OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', OrderSchema);
