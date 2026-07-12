const mongoose = require('mongoose');

const HomepageSectionSchema = new mongoose.Schema({
  sectionName: { type: String, required: true, unique: true }, // e.g. "hero", "about", "best-sellers"
  content: { type: mongoose.Schema.Types.Mixed, default: {} },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('HomepageSection', HomepageSectionSchema);
