// backend/src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Secret used to sign JSON Web Tokens for authenticating users
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// --------------------- REGISTER ---------------------
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Basic input validation for required registration fields
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email, and password are required' });
    }

    // Prevent duplicate accounts with the same email (case-insensitive)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'A user with that email already exists' });
    }

    const saltRounds = 10;

    // Hash the password so plain text passwords are never stored in the database
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash
    });

    await user.save();

    // On successful registration, return basic user info (no password fields)
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Error in registerUser:', err);

    // Return a generic error message to the client while logging details on the server
    const error = new Error('Server error during registration');
    error.statusCode = 500;
    return next(error);
  }
};

// --------------------- LOGIN ---------------------
const loginUser = async (req, res, next) => {
  try {
    console.log('Raw req.body in loginUser:', req.body);

    const { email, password } = req.body;
    console.log('Login attempt with email:', email);

    // Ensure both email and password are provided before attempting login
    if (!email || !password) {
      console.log('Missing email or password');
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    // Look up the user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User found?', !!user);

    if (!user) {
      console.log('No user for email:', email.toLowerCase());
      return res
        .status(401)
        .json({ message: 'Invalid email or password' });
    }

    // Compare the provided password with the stored hash
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    console.log('Password match?', passwordMatch);

    if (!passwordMatch) {
      console.log('Password mismatch for email:', email.toLowerCase());
      return res
        .status(401)
        .json({ message: 'Invalid email or password' });
    }

    console.log('JWT_SECRET defined?', !!JWT_SECRET);

    // Embed minimal user info inside the JWT payload
    const payload = { id: user._id, email: user.email };

    // Issue a signed token so the client can authenticate future requests
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Error in loginUser:', err);

    // Return a generic error message to the client while logging details on the server
    const error = new Error('Server error during login');
    error.statusCode = 500;
    return next(error);
  }
};

module.exports = {
  registerUser,
  loginUser
};
