const mongoose = require('mongoose');

const PackSizeSchema = new mongoose.Schema({
  id: { type: String, required: true }, // e.g. "200g"
  label: { type: String, required: true }, // e.g. "200g"
  grams: { type: Number, required: true },
  price: { type: Number, required: true }, // INR
  compareAt: { type: Number }, // INR, optional for strikethrough
  note: { type: String }, // e.g. "Most loved"
  sku: { type: String, unique: true, sparse: true },
  barcode: { type: String },
  stock: { type: Number, default: 100 }
});

const ProductSchema = new mongoose.Schema({
  flavorId: { type: String, required: true }, // matches Flavor.id/slug or maps to string
  packs: [PackSizeSchema],
  visibility: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
