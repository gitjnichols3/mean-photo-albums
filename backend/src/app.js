const express = require('express');
const app = express();
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const albumRoutes = require('./routes/albumRoutes');
const photoRoutes = require('./routes/photoRoutes');
const path = require('path');



//Middleware
app.use(express.json());
app.use(cors());    

//Use Routes
app.use('/api/albums', albumRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/photos', photoRoutes);



// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));



app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API is running' });
});

//export the app
module.exports = app;

