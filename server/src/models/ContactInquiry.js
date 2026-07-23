const mongoose = require('mongoose');

const ContactInquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  inquiryType: {
    type: String,
    enum: ['General', 'Product Inquiry', 'Order Status', 'Bulk Order', 'Distributor', 'Franchise'],
    default: 'General'
  },
  assignedTo: { type: String, default: '' },
  resolverNotes: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('ContactInquiry', ContactInquirySchema);
