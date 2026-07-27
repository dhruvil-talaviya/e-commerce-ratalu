const mongoose = require('mongoose');

const ManifestSchema = new mongoose.Schema({
  shipmentIds: [{ type: Number, required: true }],
  manifestUrl: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Manifest', ManifestSchema);
