const express = require('express');
const {
  createAlbum,
  getAlbums,
  getAlbumById,
  updateAlbum,
  deleteAlbum,
  addEventToAlbum,
  updateEventInAlbum,
  deleteEventFromAlbum,
  getOrCreateShareLink,
} = require('../controllers/albumController');


const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, createAlbum);
router.get('/', authMiddleware, getAlbums);
router.get('/:id', authMiddleware, getAlbumById);

// Events
router.post('/:id/events', authMiddleware, addEventToAlbum);
router.put('/:id/events/:eventId', authMiddleware, updateEventInAlbum);
router.delete('/:id/events/:eventId', authMiddleware, deleteEventFromAlbum);

router.put('/:id', authMiddleware, updateAlbum);
router.delete('/:id', authMiddleware, deleteAlbum);

// @route POST /api/albums/:id/share
// @desc  Create (or get existing) share slug for this album
// @access Private
router.post('/:id/share', authMiddleware, getOrCreateShareLink);






module.exports = router;
