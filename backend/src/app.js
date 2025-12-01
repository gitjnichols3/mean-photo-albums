const express = require('express');
const app = express();
const cors = require('cors');

//Middleware
app.use(express.json());
app.use(cors());    

//Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API is running' });
});

//export the app
module.exports = app;

