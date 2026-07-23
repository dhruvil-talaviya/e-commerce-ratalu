const mongoose = require('mongoose');

const OtpLogSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  ip: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['request', 'verify_fail'],
    required: true
  },
  createdAt: { type: Date, default: Date.now, index: { expires: 900 } } // auto-expires in 15 minutes
});

module.exports = mongoose.model('OtpLog', OtpLogSchema);
