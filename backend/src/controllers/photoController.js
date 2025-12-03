const Photo = require('../models/Photo');
const Album = require('../models/Album');

const uploadPhoto = async (req, res) => {
  try {
    const { albumId, eventId } = req.body;

    // Validate request
    if (!albumId) {
      return res.status(400).json({ message: 'albumId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check album ownership
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res.status(404).json({ message: 'Album not found or not authorized' });
    }

    // (Optional for now) verify the event exists in the album
    // We won’t enforce this yet to keep it simple.

    // Build the photo document
    const photo = new Photo({
      albumId,
      eventId: eventId || null,
      photographerId: req.user.id,
      originalUrl: `/uploads/${req.file.filename}`, // public serving path
      uploadedAt: new Date(),
      takenAt: null // EXIF comes later
    });

    await photo.save();

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo
    });

  } catch (err) {
    console.error('Error in uploadPhoto:', err.message);
    res.status(500).json({ message: 'Server error while uploading photo' });
  }
};

module.exports = {
  uploadPhoto,
};
