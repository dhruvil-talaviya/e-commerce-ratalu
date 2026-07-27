const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const { resolveFolder } = require('../constants/cloudinaryFolders');
const logger = require('../config/logger');

/**
 * Uploads a file buffer directly to Cloudinary using upload_stream
 * @param {Buffer} buffer - File buffer from Multer
 * @param {Object} options - Upload options { folder, publicId, cloudinaryOptions }
 * @returns {Promise<Object>} Metadata: secure_url, public_id, width, height, bytes, format
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      return reject(new Error('Invalid file buffer provided for Cloudinary upload.'));
    }

    const folderPath = resolveFolder(options.folder);
    const uploadOptions = {
      folder: folderPath,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
      overwrite: true,
      invalidate: true,
      ...options.cloudinaryOptions
    };

    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        logger.error('Cloudinary upload stream error:', error);
        return reject(new Error(`Cloudinary upload failed: ${error.message}`));
      }

      resolve({
        secure_url: result.secure_url,
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
        resource_type: result.resource_type,
        createdAt: result.created_at || new Date().toISOString()
      });
    });

    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });
};

/**
 * Deletes an asset from Cloudinary using public_id
 * @param {string} publicId - The public_id of the asset in Cloudinary
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return { result: 'not_found' };
  try {
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    logger.info(`Deleted Cloudinary asset [${publicId}]:`, result);
    return result;
  } catch (error) {
    logger.error(`Error deleting Cloudinary asset [${publicId}]:`, error);
    return { result: 'error', message: error.message };
  }
};

/**
 * Extracts public_id from a Cloudinary URL string
 * @param {string} url - Cloudinary URL or public_id
 * @returns {string|null} public_id
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com')) return url;

  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    let path = parts[1];
    path = path.replace(/^v\d+\//, '');
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      path = path.substring(0, lastDotIndex);
    }
    return path;
  } catch (err) {
    return null;
  }
};

/**
 * Safely deletes a Cloudinary asset when given either a URL or a public_id
 * @param {string} urlOrPublicId 
 */
const deleteCloudinaryAssetByUrlOrId = async (urlOrPublicId) => {
  if (!urlOrPublicId) return { result: 'not_found' };
  const publicId = extractPublicIdFromUrl(urlOrPublicId) || urlOrPublicId;
  if (publicId && !publicId.startsWith('http://') && !publicId.startsWith('https://')) {
    return await deleteFromCloudinary(publicId);
  }
  return { result: 'not_found' };
};

/**
 * Replaces an existing Cloudinary image asset
 * @param {Buffer} buffer - New file buffer
 * @param {string} oldPublicId - Existing public_id to destroy
 * @param {Object} options - Upload options for new asset
 * @returns {Promise<Object>} Upload metadata for new asset
 */
const replaceInCloudinary = async (buffer, oldPublicId, options = {}) => {
  const uploadResult = await uploadToCloudinary(buffer, options);
  if (oldPublicId) {
    await deleteCloudinaryAssetByUrlOrId(oldPublicId);
  }
  return uploadResult;
};

/**
 * Generates an optimized Cloudinary CDN URL with dynamic transformations
 * @param {string} publicId - Cloudinary public_id
 * @param {Object} transformation - e.g. { width, height, crop, quality, format }
 * @returns {string} Transformed Cloudinary URL
 */
const getOptimizedUrl = (publicId, transformation = {}) => {
  if (!publicId) return '';
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
    return publicId;
  }
  return cloudinary.url(publicId, {
    secure: true,
    quality: 'auto',
    fetch_format: 'auto',
    ...transformation
  });
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicIdFromUrl,
  deleteCloudinaryAssetByUrlOrId,
  replaceInCloudinary,
  getOptimizedUrl
};
