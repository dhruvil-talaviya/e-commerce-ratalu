const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // null if broadcast to all
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  type: {
    type: String,
    enum: ['OrderStatus', 'Coupon', 'Offer', 'General'],
    default: 'General'
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
