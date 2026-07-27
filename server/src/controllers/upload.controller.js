const {
  uploadToCloudinary,
  deleteFromCloudinary,
  replaceInCloudinary
} = require('../services/cloudinary.service');
const Media = require('../models/Media');
const sendResponse = require('../utils/response');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Upload Single Image to Cloudinary
// @route   POST /api/v1/upload/single
// @access  Private (Admin or Authenticated User)
exports.uploadSingleImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ErrorResponse('Please select an image file to upload', 400));
    }

    const folder = req.body.folder || 'products';
    const replacePublicId = req.body.replacePublicId;

    let result;
    if (replacePublicId) {
      result = await replaceInCloudinary(req.file.buffer, replacePublicId, { folder });
    } else {
      result = await uploadToCloudinary(req.file.buffer, { folder });
    }

    // Save/update in Media model
    const media = await Media.create({
      url: result.secure_url,
      public_id: result.public_id,
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      size: result.bytes,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      format: result.format
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Image uploaded successfully to Cloudinary',
      data: {
        ...result,
        mediaId: media._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload Multiple Images to Cloudinary
// @route   POST /api/v1/upload/multiple
// @access  Private (Admin or Authenticated User)
exports.uploadMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new ErrorResponse('Please select at least one image file to upload', 400));
    }

    const folder = req.body.folder || 'products';

    const uploadPromises = req.files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, { folder });
      const media = await Media.create({
        url: result.secure_url,
        public_id: result.public_id,
        name: file.originalname,
        mimeType: file.mimetype,
        size: result.bytes,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        format: result.format
      });
      return {
        ...result,
        mediaId: media._id
      };
    });

    const results = await Promise.all(uploadPromises);

    sendResponse(res, 200, {
      success: true,
      message: `${results.length} images uploaded successfully to Cloudinary`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Image from Cloudinary & Database
// @route   DELETE /api/v1/upload/:public_id or POST /api/v1/upload/delete
// @access  Private (Admin or Authenticated User)
exports.deleteImage = async (req, res, next) => {
  try {
    const public_id = req.params.public_id || req.body.public_id || req.query.public_id;
    if (!public_id) {
      return next(new ErrorResponse('public_id is required to delete an image', 400));
    }

    // Decode public_id if passed as URL param (e.g. yamora%2Fproducts%2Fxyz)
    const decodedPublicId = decodeURIComponent(public_id);

    const deleteResult = await deleteFromCloudinary(decodedPublicId);

    // Clean up Media record if exists
    await Media.deleteMany({ public_id: decodedPublicId });

    sendResponse(res, 200, {
      success: true,
      message: 'Asset deleted successfully from Cloudinary',
      data: deleteResult
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Replace existing image on Cloudinary
// @route   POST /api/v1/upload/replace
// @access  Private (Admin)
exports.replaceImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ErrorResponse('Please select a new image file to upload', 400));
    }

    const { oldPublicId, folder = 'products' } = req.body;
    const result = await replaceInCloudinary(req.file.buffer, oldPublicId, { folder });

    const media = await Media.create({
      url: result.secure_url,
      public_id: result.public_id,
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      size: result.bytes,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      format: result.format
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Image replaced successfully on Cloudinary',
      data: {
        ...result,
        mediaId: media._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Legacy / Backward Compatibility Upload Endpoint
// @route   POST /api/v1/media/upload
// @access  Private
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ErrorResponse('Please select a file to upload', 400));
    }

    const folder = req.body.folder || 'products';
    const result = await uploadToCloudinary(req.file.buffer, { folder });

    const media = await Media.create({
      url: result.secure_url,
      public_id: result.public_id,
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      size: result.bytes,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      format: result.format
    });

    sendResponse(res, 200, {
      success: true,
      message: 'File uploaded successfully to Cloudinary',
      data: {
        url: result.secure_url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
        _id: media._id,
        name: media.name
      }
    });
  } catch (error) {
    next(error);
  }
};
