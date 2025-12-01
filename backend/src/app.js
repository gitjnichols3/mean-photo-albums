const express = require('express');
const app = express();
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');


//Middleware
app.use(express.json());
app.use(cors());    

//Use Routes
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API is running' });
});

//export the app
module.exports = app;

