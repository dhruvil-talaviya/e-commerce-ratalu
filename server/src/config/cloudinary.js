const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  logger.warn('Cloudinary credentials missing in environment variables. Image uploads will fail until set.');
} else {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  logger.info(`Cloudinary configured for cloud_name: ${cloudName}`);
}

module.exports = cloudinary;
