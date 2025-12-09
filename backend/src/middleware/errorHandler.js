// backend/middleware/errorHandler.js

// Centralized Express error handler to return consistent JSON errors
// and prevent unhandled exceptions from crashing the server
function errorHandler(err, req, res, next) {
  // Log full error details on the server for debugging
  console.error(err);

  // If headers were already sent, delegate to the default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Default to a generic server error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server error';

  // Handle Mongoose schema validation failures (bad or missing input)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';

    // Extract individual field error messages for the client
    const fields = Object.values(err.errors || {}).map(e => e.message);

    return res.status(statusCode).json({
      message,
      fields
    });
  }

  // Handle invalid MongoDB ObjectId values gracefully
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Invalid id';
  }

  // Fallback JSON error response for all other cases
  return res.status(statusCode).json({
    message
  });
}

module.exports = errorHandler;
