const fs = require('fs');
const path = require('path');
const exifr = require('exifr');           // 👈 NEW
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
      ownerId: req.user.id,
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // (Optional for now) verify the event exists in the album
    // We won’t enforce this yet to keep it simple.

    // Try to read EXIF "taken at" date from the uploaded file
    let takenAt = null;
    try {
      const filePath = path.join(
        __dirname,
        '..',
        '..',
        'uploads',
        req.file.filename
      );

      const exif = await exifr.parse(filePath);

      if (exif) {
        // Common EXIF date fields: DateTimeOriginal or CreateDate
        takenAt = exif.DateTimeOriginal || exif.CreateDate || null;
      }
    } catch (exifErr) {
      console.warn(
        'EXIF parse failed for',
        req.file?.filename,
        exifErr?.message || exifErr
      );
      // We silently fall back to uploadedAt
    }

    // Build the photo document
    const photo = new Photo({
      albumId,
      eventId: eventId || null,
      photographerId: req.user.id,
      originalUrl: `/uploads/${req.file.filename}`, // public serving path
      uploadedAt: new Date(),
      takenAt: takenAt || null, // if EXIF found, use it; else remain null
    });

    await photo.save();

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo,
    });
  } catch (err) {
    console.error('Error in uploadPhoto:', err.message);
    res
      .status(500)
      .json({ message: 'Server error while uploading photo' });
  }
};

const getPhotosForAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;

    if (!albumId) {
      return res.status(400).json({ message: 'albumId is required' });
    }

    // Make sure the album belongs to the logged-in user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id,
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // You might later decide to sort by takenAt if present;
    // for now we keep uploadedAt for consistency.
    const photos = await Photo.find({ albumId }).sort({ uploadedAt: 1 });

    res.json({ photos });
  } catch (err) {
    console.error('Error in getPhotosForAlbum:', err.message);
    res
      .status(500)
      .json({ message: 'Server error while fetching photos' });
  }
};

const deletePhoto = async (req, res) => {
  try {
    const { photoId } = req.params;

    if (!photoId) {
      return res.status(400).json({ message: 'photoId is required' });
    }

    const photo = await Photo.findById(photoId);

    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    // Make sure the album belongs to this user
    const album = await Album.findOne({
      _id: photo.albumId,
      ownerId: req.user.id,
    });

    if (!album) {
      return res
        .status(403)
        .json({ message: 'Not authorized to delete this photo' });
    }

    // Build file path
    const filePath = path.join(
      __dirname,
      '..',
      '..',
      'uploads',
      path.basename(photo.originalUrl)
    );

    // Delete file from disk if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await photo.deleteOne();

    res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ message: 'Failed to delete photo' });
  }
};

module.exports = {
  uploadPhoto,
  getPhotosForAlbum,
  deletePhoto,
};
