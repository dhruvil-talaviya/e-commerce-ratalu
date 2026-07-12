const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: { type: String, required: true },
  mimeType: { type: String },
  size: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Media', MediaSchema);
