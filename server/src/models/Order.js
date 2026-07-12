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
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  userName: { type: String, required: true },
  userPhone: { type: String, required: true },
  items: [OrderItemSchema],
  totals: {
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    gst: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true }
  },
  address: {
    tag: { type: String },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  method: { type: String, required: true },
  status: {
    type: String,
    enum: [
      'Pending',
      'Confirmed',
      'Packed',
      'Ready for Dispatch',
      'In Transit',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
      'Refund Requested',
      'Refund Approved',
      'Refund Completed',
      'Returned',
      'Return Requested',
      'Return Approved'
    ],
    default: 'Pending'
  },
  timeline: [OrderTimelineSchema],
  invoiceNumber: { type: String },
  courierName: { type: String },
  trackingNumber: { type: String },
  customerNotes: { type: String },
  internalNotes: { type: String }
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

module.exports = mongoose.model('Order', OrderSchema);
