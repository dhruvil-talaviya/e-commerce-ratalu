const mongoose = require('mongoose');

/**
 * A customer's refund / return request and its full lifecycle.
 *
 * Deliberately a separate collection from Order: one order can have several
 * requests over time (a rejected one, then an accepted one), and the money
 * movement needs its own audit trail that survives edits to the order.
 *
 * Nothing here calls Razorpay on its own. Money only moves after an admin
 * approves, and only through `refund.service.processRazorpayRefund`.
 */

const REFUND_STATUSES = [
  'Submitted',        // customer has asked
  'Under Review',     // admin picked it up
  'More Info Needed', // admin bounced it back to the customer
  'Approved',         // admin said yes — money not moved yet
  'Rejected',         // admin said no — terminal
  'Pickup Scheduled', // courier booked for a return
  'Item Received',    // warehouse confirmed it back
  'Refund Processing',// Razorpay call in flight / pending at the bank
  'Refunded',         // money is back with the customer — terminal
  'Failed',           // Razorpay rejected the refund
  'Cancelled'         // customer withdrew — terminal
];

const REFUND_REASONS = [
  'Wrong Product',
  'Damaged Product',
  'Missing Item',
  'Quality Issue',
  'Product Not as Described',
  'Size Issue',
  'Duplicate Order',
  'Ordered by Mistake',
  'Other'
];

/** One entry per state change. Append-only. */
const TimelineSchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: '' },
  by: { type: String, default: '' },      // 'customer' or the admin username
  at: { type: Date, default: Date.now }
}, { _id: false });

const RefundSchema = new mongoose.Schema({
  /** Human-readable, e.g. "REF-000012". Assigned from the Counter. */
  refundId: { type: String, required: true, unique: true },

  // ─── Links ─────────────────────────────────────────────────────────────────
  orderId: { type: String, required: true, index: true },   // Order.id, e.g. RWUMK274
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },

  // Snapshotted so the request stays readable even if the order is edited.
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  orderTotal: { type: Number, required: true },

  // ─── What the customer asked for ───────────────────────────────────────────
  type: {
    type: String,
    enum: ['Refund', 'Replacement'],
    default: 'Refund'
  },
  reason: { type: String, enum: REFUND_REASONS, required: true },
  description: { type: String, default: '' },
  images: [{ type: String }],
  videos: [{ type: String }],

  /**
   * Which lines the customer wants money back for. Empty = the whole order.
   * Snapshotted (name/price/qty) so a later catalogue change can't alter what
   * was agreed at request time.
   */
  items: [{
    flavorId: String,
    flavorName: String,
    packId: String,
    packLabel: String,
    unitPrice: Number,
    quantity: Number
  }],

  // ─── Workflow ──────────────────────────────────────────────────────────────
  status: { type: String, enum: REFUND_STATUSES, default: 'Submitted', index: true },
  timeline: [TimelineSchema],

  requestedAmount: { type: Number, required: true, min: 0 },

  /**
   * What the admin actually approved. Can be less than requested (partial).
   * Null until an approval happens.
   */
  approvedAmount: { type: Number, default: null },
  refundType: { type: String, enum: ['Full', 'Partial'], default: null },

  rejectionReason: { type: String, default: '' },
  customerNotes: { type: String, default: '' },
  internalNotes: { type: String, default: '' },

  approvedBy: { type: String, default: '' },
  rejectedBy: { type: String, default: '' },

  // ─── Money ─────────────────────────────────────────────────────────────────
  // The ledger. Kept per-refund so finance can reconcile without recomputing.
  ledger: {
    itemsAmount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    restockingFee: { type: Number, default: 0 },
    gatewayFee: { type: Number, default: 0 },
    netRefund: { type: Number, default: 0 }
  },

  // ─── Razorpay ──────────────────────────────────────────────────────────────
  razorpayPaymentId: { type: String, default: '' },
  razorpayOrderId: { type: String, default: '' },
  razorpayRefundId: { type: String, default: '', index: true },
  gatewayStatus: { type: String, default: '' },   // 'pending' | 'processed' | 'failed'
  gatewayResponse: { type: mongoose.Schema.Types.Mixed },
  failureReason: { type: String, default: '' },

  /**
   * Sent to Razorpay as `Idempotency-Key`. Generated once when the refund is
   * first attempted and reused on every retry, so a network timeout followed by
   * a retry can never move the money twice.
   */
  idempotencyKey: { type: String, default: '' },

  // ─── Dates (the spec's explicit fields) ────────────────────────────────────
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  pickupScheduledAt: { type: Date, default: null },
  itemReceivedAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },

  /** Set once stock has been returned, so it can never be added twice. */
  stockRestored: { type: Boolean, default: false },

  ipAddress: { type: String, default: '' }
}, { timestamps: true });

RefundSchema.index({ status: 1, createdAt: -1 });
RefundSchema.index({ customerId: 1, createdAt: -1 });

RefundSchema.statics.STATUSES = REFUND_STATUSES;
RefundSchema.statics.REASONS = REFUND_REASONS;

/** Statuses after which no money can still move. */
RefundSchema.statics.TERMINAL = ['Rejected', 'Refunded', 'Cancelled'];

/** Append a timeline entry and move the status in one place. */
RefundSchema.methods.transition = function (status, { note = '', by = '' } = {}) {
  this.status = status;
  this.timeline.push({ status, note, by, at: new Date() });
};

module.exports = mongoose.model('Refund', RefundSchema);
