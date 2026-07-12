const logger = require('../config/logger');

/**
 * Sends OTP SMS using selected SMS gateway.
 * For development, it writes the OTP to console logs.
 */
const sendSMS = async (phone, otp) => {
  logger.info(`[SMS Dispatch Simulation] Phone: +91 ${phone} | Code: ${otp}`);
  
  // Future Twilio/MSG91 integration placeholder:
  // const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  // await client.messages.create({ body: `Your Ratalu verification code is ${otp}`, from: '+1234567890', to: `+91${phone}` });
  
  return true;
};

module.exports = {
  sendSMS
};
