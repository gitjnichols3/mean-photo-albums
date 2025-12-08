const fs = require('fs');
const path = require('path');
const exifr = require('exifr');
const Photo = require('../models/Photo');
const Album = require('../models/Album');

// Small helper to guard against missing auth (same pattern as albumController)
function ensureUser(req, res) {
  if (!req.user || !req.user.id) {
    res.status(401).json({ message: 'Not authenticated' });
    return false;
  }
  return true;
}

// POST /api/photos/upload (or whatever route you wired)
const uploadPhoto = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

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
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

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
      // Silently fall back to uploadedAt
    }

    // Build the photo document
    const photo = new Photo({
      albumId,
      eventId: eventId || null,
      photographerId: req.user.id,
      originalUrl: `/uploads/${req.file.filename}`, // public serving path
      uploadedAt: new Date(),
      takenAt: takenAt || null // if EXIF found, use it; else remain null
    });

    await photo.save();

    return res.status(201).json({
      message: 'Photo uploaded successfully',
      photo
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/photos/album/:albumId (or similar)
const getPhotosForAlbum = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

  try {
    const { albumId } = req.params;

    if (!albumId) {
      return res.status(400).json({ message: 'albumId is required' });
    }

    // Make sure the album belongs to the logged-in user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // You might later decide to sort by takenAt if present;
    // for now we keep uploadedAt for consistency.
    const photos = await Photo.find({ albumId }).sort({ uploadedAt: 1 });

    return res.json({ photos });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/photos/:photoId
const deletePhoto = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

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
      ownerId: req.user.id
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

    return res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    // Invalid ObjectId etc. will bubble to errorHandler
    return next(err);
  }
};

module.exports = {
  uploadPhoto,
  getPhotosForAlbum,
  deletePhoto
};
