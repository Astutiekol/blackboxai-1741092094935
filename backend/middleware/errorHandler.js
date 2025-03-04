const { logger } = require('../config/logger');

// Custom error class for API errors
class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Production error response
  if (err.isOperational) {
    // Operational, trusted error: send message to client
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Programming or other unknown error: don't leak error details
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong'
  });
};

// Handle specific types of errors
const handleSolanaError = (err) => {
  if (err.message.includes('insufficient funds')) {
    return new APIError('Insufficient funds for transaction', 400);
  }
  if (err.message.includes('invalid address')) {
    return new APIError('Invalid Solana address', 400);
  }
  return new APIError('Blockchain transaction failed', 500);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new APIError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new APIError(message, 400);
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new APIError(message, 400);
};

// Async error handler wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Rate limiting error
const handleTooManyRequests = () => {
  return new APIError('Too many requests. Please try again later.', 429);
};

// JWT errors
const handleJWTError = () => {
  return new APIError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new APIError('Your token has expired. Please log in again.', 401);
};

// Socket.io error handler
const handleSocketError = (err, socket) => {
  logger.error('Socket Error:', {
    message: err.message,
    stack: err.stack,
    socketId: socket.id
  });

  socket.emit('error', {
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

module.exports = {
  APIError,
  errorHandler,
  catchAsync,
  handleSolanaError,
  handleValidationError,
  handleDuplicateFieldsDB,
  handleCastErrorDB,
  handleTooManyRequests,
  handleJWTError,
  handleJWTExpiredError,
  handleSocketError
};
