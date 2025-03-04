const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to Winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define log transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }),
  // Error log file transport
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.uncolorize(),
      winston.format.json(),
    ),
  }),
  // Combined log file transport
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    format: winston.format.combine(
      winston.format.uncolorize(),
      winston.format.json(),
    ),
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create a stream object for Morgan middleware
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Setup logger function
const setupLogger = () => {
  // Add exception handlers
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/exceptions.log'),
    }),
  );

  // Add rejection handlers
  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/rejections.log'),
    }),
  );

  return logger;
};

// Helper function to log errors with stack traces
const logError = (error, context = '') => {
  logger.error(`${context} ${error.message}`, {
    stack: error.stack,
    context,
  });
};

// Helper function to log API requests
const logRequest = (req, res, next) => {
  logger.http(`${req.method} ${req.url}`);
  next();
};

// Helper function to log performance metrics
const logPerformance = (label, startTime) => {
  const duration = Date.now() - startTime;
  logger.debug(`${label} took ${duration}ms`);
};

module.exports = {
  logger,
  setupLogger,
  stream,
  logError,
  logRequest,
  logPerformance,
};
