const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadPhoto, getPhotosForAlbum } = require('../controllers/photoController');

// @route POST /api/photos/upload
// @desc  Upload a photo to an album/event
// @access Private
router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  uploadPhoto
);

// @route GET /api/photos/album/:albumId
// @desc  Get all photos for a given album (for the logged-in user)
// @access Private
router.get(
  '/album/:albumId',
  authMiddleware,
  getPhotosForAlbum
);

module.exports = router;
