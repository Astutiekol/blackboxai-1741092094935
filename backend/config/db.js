const { Pool } = require('pg');
const mongoose = require('mongoose');
const { logger } = require('./logger');

// PostgreSQL configuration
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for some cloud platforms
  }
});

// MongoDB configuration
const mongoConfig = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Setup database connections
async function setupDatabase() {
  try {
    // Test PostgreSQL connection
    await pgPool.query('SELECT NOW()');
    logger.info('PostgreSQL connected');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, mongoConfig);
    logger.info('MongoDB connected');

    // Setup MongoDB connection error handlers
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    // Setup PostgreSQL error handlers
    pgPool.on('error', (error) => {
      logger.error('PostgreSQL pool error:', error);
    });

    return { pgPool, mongoose };
  } catch (error) {
    logger.error('Database connection error:', error);
    throw error;
  }
}

// Close database connections
async function closeConnections() {
  try {
    // Close PostgreSQL pool
    await pgPool.end();
    logger.info('PostgreSQL pool closed');

    // Close MongoDB connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
    throw error;
  }
}

// Helper function to get PostgreSQL client
async function getPgClient() {
  const client = await pgPool.connect();
  return client;
}

// Helper function to execute PostgreSQL query
async function executeQuery(text, params) {
  const start = Date.now();
  try {
    const res = await pgPool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error', { text, error });
    throw error;
  }
}

// Transaction helper
async function withTransaction(callback) {
  const client = await getPgClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// MongoDB Models
const Ticket = mongoose.model('Ticket', {
  ticketNumber: { type: String, required: true, unique: true },
  owner: { type: String, required: true },
  drawDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'drawn', 'won', 'expired'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Draw = mongoose.model('Draw', {
  drawNumber: { type: Number, required: true, unique: true },
  drawDate: { type: Date, required: true },
  winningNumbers: [Number],
  winners: [{
    address: String,
    prize: Number,
    ticketNumber: String
  }],
  jackpot: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  setupDatabase,
  closeConnections,
  getPgClient,
  executeQuery,
  withTransaction,
  pgPool,
  Ticket,
  Draw
};
