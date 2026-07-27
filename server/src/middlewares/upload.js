const multer = require('multer');
const path = require('path');
const ErrorResponse = require('../utils/errorResponse');

// Strictly use in-memory storage (no local disk temporary files)
const storage = multer.memoryStorage();

// Allowed image & video formats
const ALLOWED_IMAGE_TYPES = /jpeg|jpg|png|webp|avif|gif|svg/;
const ALLOWED_VIDEO_TYPES = /mp4|webm|mov|quicktime|m4v|mkv/;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB to support videos and high-res assets

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimetype = file.mimetype.toLowerCase();

  const isImage = ALLOWED_IMAGE_TYPES.test(ext) || ALLOWED_IMAGE_TYPES.test(mimetype) || mimetype.startsWith('image/');
  const isVideo = ALLOWED_VIDEO_TYPES.test(ext) || ALLOWED_VIDEO_TYPES.test(mimetype) || mimetype.startsWith('video/');

  if (isImage || isVideo) {
    return cb(null, true);
  }

  cb(
    new ErrorResponse(
      `Unsupported file format: .${ext}. Only image (JPG, PNG, WEBP, AVIF, GIF, SVG) and video (MP4, WebM, MOV) formats are allowed.`,
      400
    )
  );
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

/**
 * Single file upload middleware wrapper with custom error handling
 * @param {string} fieldname - Form field name (defaults to 'file')
 */
const uploadSingle = (fieldname = 'file') => (req, res, next) => {
  uploadMiddleware.single(fieldname)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ErrorResponse('File size exceeds maximum allowed limit of 50 MB.', 400));
      }
      return next(new ErrorResponse(`Upload error: ${err.message}`, 400));
    } else if (err) {
      return next(err);
    }
    next();
  });
};

/**
 * Array file upload middleware wrapper
 * @param {string} fieldname - Form field name (defaults to 'files')
 * @param {number} maxCount - Max file count (defaults to 10)
 */
const uploadArray = (fieldname = 'files', maxCount = 10) => (req, res, next) => {
  uploadMiddleware.array(fieldname, maxCount)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ErrorResponse('One or more files exceed the 50 MB size limit.', 400));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new ErrorResponse(`Exceeded maximum allowed files limit of ${maxCount}.`, 400));
      }
      return next(new ErrorResponse(`Upload error: ${err.message}`, 400));
    } else if (err) {
      return next(err);
    }
    next();
  });
};

module.exports = {
  uploadSingle,
  uploadArray,
  uploadMiddleware
};
