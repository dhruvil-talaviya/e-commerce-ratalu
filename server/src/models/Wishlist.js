const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true
  },
  ids: [{ type: String }] // flavorIds/slugs
}, { timestamps: true });

module.exports = mongoose.model('Wishlist', WishlistSchema);
