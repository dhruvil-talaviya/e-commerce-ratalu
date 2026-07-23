const mongoose = require('mongoose');

/**
 * A payment attempt against an order.
 *
 * One order can have multiple Payment documents (e.g. a failed Razorpay
 * attempt followed by a successful retry), so this is an append-only audit
 * trail. The authoritative, query-friendly state also lives on Order.payment.
 */
const PaymentSchema = new mongoose.Schema({
  // Human-readable order id (Order.id, e.g. "RW4B7A82")
  orderId: { type: String, required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },

  method: {
    type: String,
    enum: ['COD', 'Razorpay', 'UPI', 'Card', 'Wallet'],
    required: true
  },
  gateway: {
    type: String,
    enum: ['cod', 'razorpay'],
    required: true
  },

  amount: { type: Number, required: true, min: 0 }, // in rupees
  currency: { type: String, default: 'INR' },

  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded', 'Cancelled'],
    default: 'Pending',
    index: true
  },

  // Gateway identifiers
  gatewayOrderId: { type: String, index: true },   // razorpay_order_id
  transactionId: { type: String, index: true },    // razorpay_payment_id
  gatewaySignature: { type: String },

  // Full gateway payload for audit/debugging (never trusted for state)
  gatewayResponse: { type: mongoose.Schema.Types.Mixed },

  failureReason: { type: String },
  paidAt: { type: Date },
  refundedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
