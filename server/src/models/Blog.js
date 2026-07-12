const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  image: { type: String },
  tags: [{ type: String }],
  author: { type: String, default: 'Admin' },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
  publishedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Blog', BlogSchema);
