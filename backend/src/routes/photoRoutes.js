const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadPhoto } = require('../controllers/photoController');

// @route POST /api/photos/upload
// @desc  Upload a photo to an album/event
// @access Private
router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  uploadPhoto
);

module.exports = router;
