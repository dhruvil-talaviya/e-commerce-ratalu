const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  action: { type: String, required: true }, // e.g., 'login', 'checkout_complete', 'wishlist_added'
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
