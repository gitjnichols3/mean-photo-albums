// backend/src/controllers/albumController.js
const Album = require('../models/Album');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Photo = require('../models/Photo');

// Small helper to guard against missing auth
function ensureUser(req, res) {
  if (!req.user || !req.user.id) {
    res.status(401).json({ message: 'Not authenticated' });
    return false;
  }
  return true;
}

// POST /api/albums
const createAlbum = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

  try {
    const { title, description, events } = req.body;

    // Basic validation
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Build embedded events array (if provided), ensuring each has an eventId
    let normalizedEvents = [];
    if (Array.isArray(events)) {
      normalizedEvents = events.map((event) => ({
        eventId: event.eventId || uuidv4(), // generate an id if not provided
        name: event.name,
        startDate: event.startDate || null,
        endDate: event.endDate || null,
        location: event.location || ''
      }));
    }

    // Create the album, tying it to the authenticated user
    const album = new Album({
      ownerId: req.user.id, // comes from authMiddleware
      title,
      description: description || '',
      events: normalizedEvents
    });

    await album.save();

    return res.status(201).json({
      message: 'Album created successfully',
      album
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/albums
const getAlbums = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

  try {
    const userId = req.user.id; // From auth middleware

    const albums = await Album.find({ ownerId: userId }).sort({
      createdAt: -1
    });

    return res.json({
      message: 'Albums retrieved successfully',
      albums
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/albums/:id
const getAlbumById = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;

    // Look up the album AND ensure it belongs to the logged-in user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    return res.json({
      message: 'Album retrieved successfully',
      album
    });
  } catch (err) {
    // CastError (bad ObjectId) will go to errorHandler
    return next(err);
  }
};

// PATCH /api/albums/:id
const updateAlbum = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;
    const { title, description } = req.body;

    // Find the album owned by the current user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    if (title !== undefined) {
      album.title = title;
    }
    if (description !== undefined) {
      album.description = description;
    }

    await album.save();

    return res.json({
      message: 'Album updated successfully',
      album
    });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/albums/:id
const deleteAlbum = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;

    // Only delete if owned by current user
    const album = await Album.findOneAndDelete({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    return res.json({
      message: 'Album deleted successfully'
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Add an embedded event to an album
 * POST /api/albums/:id/events
 */
const addEventToAlbum = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;
    const { name, startDate, endDate, location } = req.body;

    // Basic validation
    if (!name) {
      return res.status(400).json({ message: 'Event name is required' });
    }

    // find the album
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    const newEvent = {
      eventId: uuidv4(),
      name,
      startDate: startDate || null,
      endDate: endDate || null,
      location: location || ''
    };

    album.events.push(newEvent);

    await album.save();

    return res.status(201).json({
      message: 'Event added successfully',
      album,
      event: newEvent
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update an embedded event inside an album by our custom eventId field
 * PATCH /api/albums/:id/events/:eventId
 */
const updateEventInAlbum = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;
    const eventId = req.params.eventId;
    const { name, startDate, endDate, location } = req.body;

    // Find album owned by the current user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // IMPORTANT: look up by our custom eventId, not the Mongo _id
    const idx = album.events.findIndex((ev) => ev.eventId === eventId);

    if (idx === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Patch fields if provided
    if (name !== undefined) {
      album.events[idx].name = name;
    }
    if (startDate !== undefined) {
      album.events[idx].startDate = startDate || null;
    }
    if (endDate !== undefined) {
      album.events[idx].endDate = endDate || null;
    }
    if (location !== undefined) {
      album.events[idx].location = location;
    }

    await album.save();

    return res.json({
      message: 'Event updated successfully',
      album,
      event: album.events[idx]
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete an embedded event from an album
 * DELETE /api/albums/:id/events/:eventId
 */
const deleteEventFromAlbum = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;
    const eventId = req.params.eventId;

    // Find the album owned by the current user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // IMPORTANT: events do not have Mongo _id; they use our custom eventId
    const idx = album.events.findIndex((ev) => ev.eventId === eventId);

    if (idx === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Remove the event from the array
    const [removedEvent] = album.events.splice(idx, 1);

    // Unassign any photos associated with this event
    await Photo.updateMany(
      { albumId: album._id, eventId },
      { $unset: { eventId: '' } }
    );

    await album.save();

    return res.json({
      message: 'Event deleted successfully',
      album,
      removedEvent
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Generate or return an existing share link for an album
 * GET /api/albums/:id/share
 */
const getOrCreateShareLink = async (req, res, next) => {
  // Auth guard
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;

    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // If we already have a slug, reuse it
    if (album.shareSlug) {
      return res.json({
        message: 'Share link already exists',
        shareSlug: album.shareSlug // <-- key frontend expects
      });
    }

    // Generate a random slug
    const slug = crypto.randomBytes(8).toString('hex');
    album.shareSlug = slug;
    await album.save();

    return res.json({
      message: 'Share link created successfully',
      shareSlug: slug // <-- key frontend expects
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Public endpoint to load a shared album by slug (no auth)
 * GET /api/public/albums/:slug
 */
const getPublicAlbumBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const album = await Album.findOne({ shareSlug: slug }).lean();

    if (!album) {
      return res.status(404).json({ message: 'Shared album not found' });
    }

    // Fetch photos for this album
    const photos = await Photo.find({ albumId: album._id }).lean();

    // Optionally strip internal fields
    const { ownerId, ...publicAlbum } = album;

    return res.json({ album: publicAlbum, photos });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createAlbum,
  getAlbums,
  getAlbumById,
  updateAlbum,
  deleteAlbum,
  addEventToAlbum,
  updateEventInAlbum,
  deleteEventFromAlbum,
  getOrCreateShareLink,
  getPublicAlbumBySlug
};
