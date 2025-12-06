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





module.exports = router;
