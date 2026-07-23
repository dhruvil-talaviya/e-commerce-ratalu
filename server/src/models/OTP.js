const mongoose = require('mongoose');

/**
 * One-time password for passwordless login.
 *
 * The document auto-expires 5 minutes after creation (TTL index), and
 * `attempts` lets us burn an OTP after too many wrong guesses so it can't
 * be brute-forced within its validity window.
 */
const OTPSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } } // auto-deletes in 5 minutes
});

/** Max wrong guesses allowed for a single OTP before it is invalidated. */
OTPSchema.statics.MAX_ATTEMPTS = 5;

module.exports = mongoose.model('OTP', OTPSchema);
