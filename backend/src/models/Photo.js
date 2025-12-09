const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema(
  {
    albumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Album',
      required: true,
    },
    eventId: {
      type: String, // matches eventId in Album.events
      required: false, // might allow "unassigned" photos later
    },
    photographerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalUrl: {
      type: String, // or "path" if you prefer
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: false, 
    },
    takenAt: {
      type: Date,
      required: false, 
    },
    uploadedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // tags, rotation, etc. can go here later
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const Photo = mongoose.model('Photo', photoSchema);

module.exports = Photo;
