require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const { setupDatabase } = require('./config/db');
const { setupLogger } = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');
const lotteryRoutes = require('./routes/lotteryRoutes');
const { initializeSolanaConnection } = require('./services/solanaService');
const { setupSocketHandlers } = require('./socket/socketHandlers');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Setup logger
const logger = setupLogger();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/lottery', lotteryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Connect to databases
    await setupDatabase();
    logger.info('Database connections established');

    // Initialize Solana connection
    await initializeSolanaConnection();
    logger.info('Solana connection established');

    // Setup Socket.io handlers
    setupSocketHandlers(io);
    logger.info('Socket.io handlers initialized');

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown() {
  logger.info('Received shutdown signal');

  try {
    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close Socket.io connections
    io.close(() => {
      logger.info('Socket.io server closed');
    });

    // Close database connections
    await require('./config/db').closeConnections();
    logger.info('Database connections closed');

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start the server
startServer();
