/**
 * Yamora Wafers — Logistics System Audit Log Schema
 *
 * Records user, IP, action, timestamp, previous value, and new value for all logistics events.
 */

const mongoose = require('mongoose');

const LogisticsAuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  shipmentId: { type: String, index: true },
  orderId: { type: String, index: true },
  user: { type: String, default: 'System' },
  userRole: { type: String, default: 'system' },
  ip: { type: String, default: '' },
  previousValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  details: { type: String, default: '' },
  status: { type: String, enum: ['success', 'warning', 'error'], default: 'success' },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

LogisticsAuditLogSchema.index({ createdAt: -1 });
LogisticsAuditLogSchema.index({ orderId: 1, createdAt: -1 });

module.exports = mongoose.model('LogisticsAuditLog', LogisticsAuditLogSchema);
