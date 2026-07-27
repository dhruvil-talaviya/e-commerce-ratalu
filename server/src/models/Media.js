const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String },
  name: { type: String, required: true },
  mimeType: { type: String },
  size: { type: Number },
  bytes: { type: Number },
  width: { type: Number },
  height: { type: Number },
  format: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Media', MediaSchema);
