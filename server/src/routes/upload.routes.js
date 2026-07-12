const express = require('express');
const router = express.Router();
const { uploadFile } = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth');

router.post('/media/upload', protect, uploadFile);

module.exports = router;
