// backend/src/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config(); // load .env first

//Logged mongo connection string for development
//console.log('MONGO_URI from env:', JSON.stringify(process.env.MONGO_URI));

const connectDB = require('./config/db');        // require AFTER dotenv.config
const authRoutes = require('./routes/authRoutes');
const albumRoutes = require('./routes/albumRoutes');
const photoRoutes = require('./routes/photoRoutes');
const publicRoutes = require('./routes/publicRoutes');

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');


connectDB(); // connect to MongoDB

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/public', publicRoutes);


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

// 404 handler
app.use(notFound);

// Central error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
