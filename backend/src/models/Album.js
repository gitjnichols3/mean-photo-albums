const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,  // string is fine for event identifiers
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: false, // can be added later when photos are uploaded
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
    }
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const Album = mongoose.model('Album', albumSchema);

module.exports = Album;
