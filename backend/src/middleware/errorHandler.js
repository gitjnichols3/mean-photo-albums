// backend/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error(err); // keep this for now; you can swap to a logger later

  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server error';

  // Handle common Mongoose errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    const fields = Object.values(err.errors || {}).map(e => e.message);
    return res.status(statusCode).json({
      message,
      fields
    });
  }

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Invalid id';
  }

  // Generic JSON response
  return res.status(statusCode).json({
    message
  });
}

module.exports = errorHandler;
