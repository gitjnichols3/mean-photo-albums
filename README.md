MEAN Photo Album Application

Project overview
    This project is a full-stack photo album web application built with the MEAN stack (MongoDB, Express, Angular, and Node.js). Users can create photo albums, organize photos by events, upload images, and share public, read-only album links. The purpose of this project was to build a complete end-to-end web application that demonstrates full-stack development skills including authentication, API development, database design, file uploads, and frontend UI integration.

Prerequisites

You will need the following installed before running this project:
- Node.js v18 or newer recommended
- Angular CLI v17 or newer
- MongoDB (local install or MongoDB Atlas account)
- Git (optional but recommended)
Note: Express does NOT need to be installed separately. It is included automatically when you run "npm install" in the backend folder because it is listed in package.json.


Backend setup (Node, Express, MongoDB) -

    1. MongoDB setup - 
        For this project, you can use either a local MongoDB installation or a free MongoDB Atlas cloud database.
        - Option 1: Local MongoDB
            - Install MongoDB Community Server from mongodb.com
            - Start the MongoDB service on your machine
            - MongoDB will run by default at mongodb://127.0.0.1:27017
            - Use this format in your MONGO_URI:mongodb://127.0.0.1:27017/photo-albums

        - Option 2: MongoDB Atlas (recommended)
            - Create a free MongoDB Atlas account
            - Create a new cluster
            - Create a database user with a username and password
            - Whitelist your IP address (or allow all IPs for local testing)
            - Copy the provided connection string
            - Paste the connection string into your MONGO_URI value in the .env file

        Once MongoDB is running locally or your Atlas connection string is configured, the backend will connect automatically on startup.

    2. Navigate to the backend folder - From the root of the project: cd backend
    3. Install backend dependencies with "npm install". This installs Express, Mongoose, JWT, Multer, and other required backend packages.
    4. Configure environment variables - A starter file named .env.example is included in the backend folder.
        - Make a copy of .env.example
        - Rename the copy to .env
        - Fill in your own values
            - Create or update the .env file inside the backend folder with the following values:
                PORT=3000
                MONGO_URI=your_mongodb_connection_string
                JWT_SECRET=your_secret_key
            - PORT is the port your API runs on
            - MONGO_URI is your MongoDB connection string (local or Atlas)
            - JWT_SECRET is any secure random string used for authentication
    5. Start the backend server with "npm run dev" or "npm start". You should see console output confirming that the server is running and MongoDB is connected. The API will be available at: http://localhost:3000

Frontend setup (Angular)

    1. Navigate to the frontend folder. From the root of the project: cd frontend/photo-album-client
    2. Install frontend dependencies with "npm install". This installs Angular, RxJS, Bootstrap, and all required frontend libraries.
    3. Configure API URL - Open this file: src/environments/environment.ts. Set the API base URL to match your backend:
        production: false
        apiBaseUrl: http://localhost:3000/api
    4. Start the Angular development server with "ng serve". Once the build completes, open your browser to: http://localhost:4200


Running the full application

To run the full application locally:
1. Start MongoDB (if using a local instance)
2. Start the backend server on port 3000
3. Start the frontend Angular server on port 4200
4. Open your browser to http://localhost:4200

Notes
- Both the backend and frontend servers must be running at the same time
- If you get CORS or API errors, check that:
    - The backend is running
    - The API URL matches the backend port
    - Your .env file is configured correctly
- If file uploads do not work, make sure the uploads folder exists at this exact path: backend/uploads. If it does not exist, create a folder named "uploads" directly inside the backend folder

If you follow the steps in this README, you should be able to run this application locally without any additional setup.

