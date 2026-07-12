const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: { type: String, required: true }, // username or phone
  role: { type: String, required: true },
  action: { type: String, required: true },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
