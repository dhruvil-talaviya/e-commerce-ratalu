const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  flavorId: { type: String, required: true },
  packId: { type: String, required: true },
  currentStock: { type: Number, default: 0, min: 0 },
  lowStockAlertLimit: { type: Number, default: 10 }
}, { timestamps: true });

// Compound unique key to make querying easy
InventorySchema.index({ flavorId: 1, packId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', InventorySchema);
