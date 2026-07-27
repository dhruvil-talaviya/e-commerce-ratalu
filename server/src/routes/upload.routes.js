const express = require('express');
const router = express.Router();
const {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
  replaceImage,
  uploadFile
} = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth');
const { uploadSingle, uploadArray } = require('../middlewares/upload');

// New production Cloudinary upload endpoints
router.post('/upload/single', protect, uploadSingle('file'), uploadSingleImage);
router.post('/upload/multiple', protect, uploadArray('files', 10), uploadMultipleImages);
router.post('/upload/replace', protect, uploadSingle('file'), replaceImage);
router.post('/upload/delete', protect, deleteImage);
router.delete('/upload/:public_id(*)', protect, deleteImage);
router.delete('/upload', protect, deleteImage);

// Legacy upload path maintained for backward compatibility
router.post('/media/upload', protect, uploadSingle('file'), uploadFile);

module.exports = router;
