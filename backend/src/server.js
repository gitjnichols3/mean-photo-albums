require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');

//Connect to MongoDB
connectDB();


//start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});