const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadPhoto, getPhotosForAlbum, deletePhoto } = require('../controllers/photoController');
const Photo = require('../models/Photo');

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

// @route DELETE /api/photos/:photoId
// @desc  Delete a photo
// @access Private
router.delete(
  '/:photoId',
  authMiddleware,
  deletePhoto
);
// PATCH /api/photos/:photoId/event
router.patch('/:photoId/event', async (req, res) => {
  try {
    const { photoId } = req.params;
    const { eventId } = req.body; // can be string or null / ""

    console.log('[Photos] PATCH /:photoId/event', { photoId, eventId });

    if (!photoId) {
      return res.status(400).json({ message: 'photoId is required' });
    }

    let update;

    if (eventId) {
      // Assign to an event
      update = { $set: { eventId } };
    } else {
      // Unassign: clear the eventId field
      update = { $unset: { eventId: '' } };
    }

    const photo = await Photo.findByIdAndUpdate(photoId, update, {
      new: true,
    });

    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    return res.json({
      message: 'Photo event updated',
      photo,
    });
  } catch (err) {
    console.error('[Photos] Error reassigning photo:', err);
    return res.status(500).json({
      message: 'Failed to reassign photo',
      error: err.message,
    });
  }
});




module.exports = router;
