const mongoose = require('mongoose');

const StockHistorySchema = new mongoose.Schema({
  flavorId: { type: String, required: true },
  packId: { type: String, required: true },
  type: { type: String, enum: ['In', 'Out'], required: true },
  quantity: { type: Number, required: true },
  referenceId: { type: String }, // e.g. Order ID or Restock note
  note: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StockHistory', StockHistorySchema);
