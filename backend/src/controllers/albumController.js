const Album = require('../models/Album');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Photo = require('../models/Photo');


const createAlbum = async (req, res) => {
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
        location: event.location || '',
      }));
    }

    // Create the album, tying it to the authenticated user
    const album = new Album({
      ownerId: req.user.id, // comes from authMiddleware
      title,
      description: description || '',
      events: normalizedEvents,
    });

    await album.save();

    res.status(201).json({
      message: 'Album created successfully',
      album,
    });
  } catch (err) {
    console.error('Error in createAlbum:', err.message);
    res.status(500).json({ message: 'Server error while creating album' });
  }
};

const getAlbums = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    const albums = await Album.find({ ownerId: userId }).sort({
      createdAt: -1,
    });

    res.json({
      message: 'Albums retrieved successfully',
      albums,
    });
  } catch (err) {
    console.error('Error in getAlbums:', err.message);
    res.status(500).json({ message: 'Server error while fetching albums' });
  }
};

const getAlbumById = async (req, res) => {
  try {
    const albumId = req.params.id;

    // Look up the album AND ensure it belongs to the logged-in user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id,
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    res.json({
      message: 'Album retrieved successfully',
      album,
    });
  } catch (err) {
    console.error('Error in getAlbumById:', err.message);
    res.status(500).json({ message: 'Server error while fetching album' });
  }
};

const updateAlbum = async (req, res) => {
  try {
    const albumId = req.params.id;
    const { title, description } = req.body;

    // Find the album owned by the current user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id,
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

    res.json({
      message: 'Album updated successfully',
      album,
    });
  } catch (err) {
    console.error('Error in updateAlbum:', err.message);
    res.status(500).json({ message: 'Server error while updating album' });
  }
};

const deleteAlbum = async (req, res) => {
  try {
    const albumId = req.params.id;

    // Only delete if owned by current user
    const album = await Album.findOneAndDelete({
      _id: albumId,
      ownerId: req.user.id,
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    res.json({
      message: 'Album deleted successfully',
    });
  } catch (err) {
    console.error('Error in deleteAlbum:', err.message);
    res.status(500).json({ message: 'Server error while deleting album' });
  }
};

/**
 * Add an embedded event to an album
 */
const addEventToAlbum = async (req, res) => {
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
      ownerId: req.user.id,
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
      location: location || '',
    };

    album.events.push(newEvent);

    await album.save();

    res.status(201).json({
      message: 'Event added successfully',
      album,
      event: newEvent,
    });
  } catch (err) {
    console.error('Error in addEventToAlbum:', err.message);
    res.status(500).json({ message: 'Server error while adding event' });
  }
};

/**
 * Update an embedded event inside an album
 */
// Update an embedded event inside an album by our custom eventId field
const updateEventInAlbum = async (req, res) => {
  try {
    const albumId = req.params.id;
    const eventId = req.params.eventId;
    const { name, startDate, location } = req.body;

    // Find album owned by the current user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id,
    });

    if (!album) {
      return res
        .status(404)
        .json({ message: 'Album not found or not authorized' });
    }

    // IMPORTANT: look up by our custom eventId, not the Mongo _id
    const idx = album.events.findIndex(ev => ev.eventId === eventId);

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
    if (location !== undefined) {
      album.events[idx].location = location;
    }

    await album.save();

    res.json({
      message: 'Event updated successfully',
      album,
      event: album.events[idx],
    });
  } catch (err) {
    console.error('Error in updateEventInAlbum:', err);
    res.status(500).json({ message: 'Server error while updating event' });
  }
};


/**
 * Delete an embedded event from an album
 */
const deleteEventFromAlbum = async (req, res) => {
  try {
    const albumId = req.params.id;
    const eventId = req.params.eventId;

    // Find the album owned by the current user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id,
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
      removedEvent,
    });
  } catch (err) {
    console.error('Error in deleteEventFromAlbum:', err.message);
    return res
      .status(500)
      .json({ message: 'Server error while deleting event' });
  }
};


/**
 * Generate or return an existing share link for an album
 */
/**
 * Generate or return an existing share link for an album
 */
const getOrCreateShareLink = async (req, res) => {
  try {
    const albumId = req.params.id;

    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id,
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
        shareSlug: album.shareSlug,   // <-- key frontend expects
      });
    }

    // Generate a random slug
    const slug = crypto.randomBytes(8).toString('hex');
    album.shareSlug = slug;
    await album.save();

    return res.json({
      message: 'Share link created successfully',
      shareSlug: slug,               // <-- key frontend expects
    });
  } catch (err) {
    console.error('Error in getOrCreateShareLink:', err);
    res.status(500).json({ message: 'Failed to create share link' });
  }
};


/**
 * Public endpoint to load a shared album by slug (no auth)
 */
const getPublicAlbumBySlug = async (req, res) => {
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

    res.json({ album: publicAlbum, photos });
  } catch (err) {
    console.error('Error in getPublicAlbumBySlug:', err);
    res.status(500).json({ message: 'Failed to load shared album' });
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
  getPublicAlbumBySlug,
};
