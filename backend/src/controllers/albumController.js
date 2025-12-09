// backend/src/controllers/albumController.js
const Album = require('../models/Album');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Photo = require('../models/Photo');

// Ensure the request is associated with an authenticated user
function ensureUser(req, res) {
  if (!req.user || !req.user.id) {
    res.status(401).json({ message: 'Not authenticated' });
    return false;
  }
  return true;
}

// POST /api/albums
const createAlbum = async (req, res, next) => {
  if (!ensureUser(req, res)) return;

  try {
    const { title, description, events } = req.body;

    // Title is required for all albums
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Normalize embedded events and ensure each one has a stable eventId
    let normalizedEvents = [];
    if (Array.isArray(events)) {
      normalizedEvents = events.map((event) => ({
        eventId: event.eventId || uuidv4(),
        name: event.name,
        startDate: event.startDate || null,
        endDate: event.endDate || null,
        location: event.location || ''
      }));
    }

    // Tie the album to the authenticated user via ownerId
    const album = new Album({
      ownerId: req.user.id,
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
  if (!ensureUser(req, res)) return;

  try {
    const userId = req.user.id;

    // Only return albums owned by the current user, newest first
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
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;

    // Look up the album and ensure it belongs to the logged-in user
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
    // CastError from an invalid ObjectId is handled by the global error handler
    return next(err);
  }
};

// PATCH /api/albums/:id
const updateAlbum = async (req, res, next) => {
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;
    const { title, description } = req.body;

    // Only allow the owner to update this album
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // Apply partial updates to the album fields
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
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;

    // Delete only if the album belongs to the current user
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
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;
    const { name, startDate, endDate, location } = req.body;

    // Every event must have a name
    if (!name) {
      return res.status(400).json({ message: 'Event name is required' });
    }

    // Only the owner can add events to this album
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
      eventId: uuidv4(), // use a UUID so events can be reliably identified inside the album
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
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;
    const eventId = req.params.eventId;
    const { name, startDate, endDate, location } = req.body;

    // Only load albums owned by the current user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // Events are stored as embedded documents, identified by a custom eventId (not Mongo _id)
    const idx = album.events.findIndex((ev) => ev.eventId === eventId);

    if (idx === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Apply partial updates to the selected event
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
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;
    const eventId = req.params.eventId;

    // Only the album owner can delete events from it
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // Events use a custom eventId, so locate the event by that key
    const idx = album.events.findIndex((ev) => ev.eventId === eventId);

    if (idx === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Remove the event from the album's events array
    const [removedEvent] = album.events.splice(idx, 1);

    // Detach any photos that were associated with this eventId
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
  if (!ensureUser(req, res)) return;

  try {
    const albumId = req.params.id;

    // Only the album owner can create or view its share link
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // Reuse an existing slug so the shared URL remains stable over time
    if (album.shareSlug) {
      return res.json({
        message: 'Share link already exists',
        shareSlug: album.shareSlug
      });
    }

    // Generate a random slug that can be safely exposed in a public URL
    const slug = crypto.randomBytes(8).toString('hex');
    album.shareSlug = slug;
    await album.save();

    return res.json({
      message: 'Share link created successfully',
      shareSlug: slug
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

    // Look up album by its public share slug instead of the internal Mongo _id
    const album = await Album.findOne({ shareSlug: slug }).lean();

    if (!album) {
      return res.status(404).json({ message: 'Shared album not found' });
    }

    // Load all photos that belong to this album
    const photos = await Photo.find({ albumId: album._id }).lean();

    // Strip internal ownership information before returning public data
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
