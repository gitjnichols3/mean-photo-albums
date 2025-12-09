const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,  
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: false, 
    },
    endDate: {
      type: Date,
      required: false,
    },
    location: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { _id: false } // prevents Mongoose from creating its own _id for embedded events
);

const albumSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    events: {
      type: [eventSchema],
      default: [],
    },
    shareSlug: {
      type: String,
      unique: true,
      sparse: true, // allows many albums without shareSlug
    }

  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const Album = mongoose.model('Album', albumSchema);

module.exports = Album;
