// backend/src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('MongoDB connection error: MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
