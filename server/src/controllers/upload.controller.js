const multer = require('multer');
const path = require('path');
const Media = require('../models/Media');
const sendResponse = require('../utils/response');
const ErrorResponse = require('../utils/errorResponse');

// Multer storage engine configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (images only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|avif/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) {
    return cb(null, true);
  } else {
    cb(new Error('Images and graphics only are allowed!'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('file');

// @desc    Upload Single Image
// @route   POST /api/v1/media/upload
// @access  Private (Admin or Authenticated Customers)
exports.uploadFile = (req, res, next) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return next(new ErrorResponse(`Multer upload error: ${err.message}`, 400));
    } else if (err) {
      return next(new ErrorResponse(err.message, 400));
    }

    if (!req.file) {
      return next(new ErrorResponse('Please select a file to upload', 400));
    }

    try {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

      // Save to media collection
      const media = await Media.create({
        url: fileUrl,
        name: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size
      });

      sendResponse(res, 200, {
        success: true,
        message: 'File uploaded successfully',
        data: media
      });
    } catch (error) {
      next(error);
    }
  });
};
