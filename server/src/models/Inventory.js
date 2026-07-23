const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  flavorId: { type: String, required: true },
  packId: { type: String, required: true },

  // ─── Stock Levels ──────────────────────────────────────────────────────────
  currentStock: { type: Number, default: 0, min: 0 },
  reservedStock: { type: Number, default: 0, min: 0 }, // held for pending orders
  lowStockAlertLimit: { type: Number, default: 10 },

  // ─── Computed virtual: availableStock = currentStock - reservedStock
  // ─── Costing ───────────────────────────────────────────────────────────────
  costPrice: { type: Number, default: 0 },   // per unit cost (for inventory valuation)

  // ─── Location ──────────────────────────────────────────────────────────────
  warehouseLocation: { type: String, default: '' },

  // ─── Meta ──────────────────────────────────────────────────────────────────
  lastRestockedAt: { type: Date, default: null },
  lastRestockedBy: { type: String, default: '' }

}, { timestamps: true });

// Compound unique key to make querying easy
InventorySchema.index({ flavorId: 1, packId: 1 }, { unique: true });
InventorySchema.index({ currentStock: 1 }); // for low stock queries

/** Available stock = on-hand minus any reserved for pending orders */
InventorySchema.virtual('availableStock').get(function () {
  return Math.max(this.currentStock - (this.reservedStock || 0), 0);
});

/** Is this item at or below the low stock threshold? */
InventorySchema.virtual('isLowStock').get(function () {
  return this.currentStock <= this.lowStockAlertLimit;
});

InventorySchema.set('toJSON', { virtuals: true });
InventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', InventorySchema);
