const Album = require('../models/Album');
const { v4: uuidv4 } = require('uuid');

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
    // Find albums owned by the logged-in user
    const albums = await Album.find({ ownerId: req.user.id }).sort({ createdAt: -1 });

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
      return res.status(404).json({ message: 'Album not found or not authorized' });
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
    const { title, description, events } = req.body;

    // Find the album and ensure it belongs to the logged-in user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id,
    });

    if (!album) {
      return res.status(404).json({ message: 'Album not found or not authorized' });
    }

    // Update basic fields if provided
    if (title !== undefined) {
      album.title = title;
    }

    if (description !== undefined) {
      album.description = description;
    }

    // Optionally update events
    if (Array.isArray(events)) {
      album.events = events.map((event) => ({
        eventId: event.eventId || uuidv4(),
        name: event.name,
        startDate: event.startDate || null,
        endDate: event.endDate || null,
        location: event.location || '',
      }));
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

const addEventToAlbum = async (req, res) => {
  try {
    const albumId = req.params.id;
    const { name, startDate, endDate, location } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Event name is required' });
    }

    // Find the album and ensure it belongs to the logged-in user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id,
    });

    if (!album) {
      return res.status(404).json({ message: 'Album not found or not authorized' });
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


const deleteAlbum = async (req, res) => {
  try {
    const albumId = req.params.id;

    // Find the album AND ensure it belongs to the logged-in user
    const album = await Album.findOne({
      _id: albumId,
      ownerId: req.user.id,
    });

    if (!album) {
      return res.status(404).json({ message: 'Album not found or not authorized' });
    }

    // Delete it
    await album.deleteOne();

    res.json({
      message: 'Album deleted successfully',
      albumId,
    });
  } catch (err) {
    console.error('Error in deleteAlbum:', err.message);
    res.status(500).json({ message: 'Server error while deleting album' });
  }
};



module.exports = {
  createAlbum,
  getAlbums,
  getAlbumById,
  updateAlbum,
  deleteAlbum,
  addEventToAlbum,
};





