const fs = require('fs');
const path = require('path');
const exifr = require('exifr');
const Photo = require('../models/Photo');
const Album = require('../models/Album');

// Ensure the request is associated with an authenticated user
function ensureUser(req, res) {
  if (!req.user || !req.user.id) {
    res.status(401).json({ message: 'Not authenticated' });
    return false;
  }
  return true;
}

// POST /api/photos/upload
const uploadPhoto = async (req, res, next) => {
  if (!ensureUser(req, res)) return;

  try {
    const { albumId, eventId } = req.body;

    // An albumId is required to associate the uploaded photo
    if (!albumId) {
      return res.status(400).json({ message: 'albumId is required' });
    }

    // A file must be attached to the request
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Confirm the album belongs to the authenticated user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // Attempt to extract the original "date taken" from the photo's EXIF metadata
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
        // Prefer DateTimeOriginal, with CreateDate as a fallback
        takenAt = exif.DateTimeOriginal || exif.CreateDate || null;
      }
    } catch (exifErr) {
      console.warn(
        'EXIF parse failed for',
        req.file?.filename,
        exifErr?.message || exifErr
      );
      // If EXIF data is unavailable, fall back to the upload timestamp
    }

    // Build the photo document for MongoDB
    const photo = new Photo({
      albumId,
      eventId: eventId || null,
      photographerId: req.user.id,
      originalUrl: `/uploads/${req.file.filename}`, // public-serving file path
      uploadedAt: new Date(),
      takenAt: takenAt || null
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

// GET /api/photos/album/:albumId
const getPhotosForAlbum = async (req, res, next) => {
  if (!ensureUser(req, res)) return;

  try {
    const { albumId } = req.params;

    if (!albumId) {
      return res.status(400).json({ message: 'albumId is required' });
    }

    // Verify the album belongs to the current user before returning photos
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // Photos are currently sorted by upload time for consistent ordering
    const photos = await Photo.find({ albumId }).sort({ uploadedAt: 1 });

    return res.json({ photos });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/photos/:photoId
const deletePhoto = async (req, res, next) => {
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

    // Verify that the photo's album belongs to the authenticated user
    const album = await Album.findOne({
      _id: photo.albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(403)
        .json({ message: 'Not authorized to delete this photo' });
    }

    // Build the absolute file system path to the image
    const filePath = path.join(
      __dirname,
      '..',
      '..',
      'uploads',
      path.basename(photo.originalUrl)
    );

    // Remove the physical file from disk if it still exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove the photo record from the database
    await photo.deleteOne();

    return res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    // Invalid ObjectId and other database errors are handled by the global error handler
    return next(err);
  }
};

module.exports = {
  uploadPhoto,
  getPhotosForAlbum,
  deletePhoto
};
