const express = require('express');
const router = express.Router();
const lotteryService = require('../services/lotteryService');
const databaseService = require('../services/databaseService');
const solanaService = require('../services/solanaService');
const { logger } = require('../config/logger');
const { catchAsync, APIError } = require('../middleware/errorHandler');

// Get active pools with real-time stats
router.get('/pools/active', catchAsync(async (req, res) => {
  const activePools = await databaseService.getActivePools();
  
  // Enhance with real-time stats from MongoDB
  const poolsWithStats = await Promise.all(
    activePools.map(async (pool) => {
      const stats = await databaseService.getPoolStatistics(pool.id);
      return { ...pool, stats };
    })
  );

  res.json({ pools: poolsWithStats });
}));

// Create new lottery pool
router.post('/pools', catchAsync(async (req, res) => {
  const {
    creatorWallet,
    name,
    description,
    minPlayers,
    maxPlayers,
    startTime,
    endTime
  } = req.body;

  // Validate input
  if (!creatorWallet || !name || !minPlayers || !maxPlayers) {
    throw new APIError('Missing required fields', 400);
  }

  const result = await lotteryService.createPool({
    creatorWallet,
    name,
    description,
    minPlayers,
    maxPlayers,
    startTime: new Date(startTime),
    endTime: new Date(endTime)
  });

  res.status(201).json(result);
}));

// Get pool details with real-time data
router.get('/pools/:poolId', catchAsync(async (req, res) => {
  const { poolId } = req.params;
  
  const [poolDetails, realTimeStats, entries] = await Promise.all([
    databaseService.getPoolById(poolId),
    databaseService.getRealTimeStats(poolId),
    databaseService.getPoolEntries(poolId)
  ]);

  if (!poolDetails) {
    throw new APIError('Pool not found', 404);
  }

  res.json({
    ...poolDetails,
    realTimeStats,
    currentEntries: entries.length
  });
}));

// Get user tickets across all pools
router.get('/tickets/:walletAddress', catchAsync(async (req, res) => {
  const { walletAddress } = req.params;

  if (!solanaService.isValidSolanaAddress(walletAddress)) {
    throw new APIError('Invalid wallet address', 400);
  }

  // Get tickets from both PostgreSQL and MongoDB
  const [pgTickets, activeEntries] = await Promise.all([
    databaseService.getUserTickets(walletAddress),
    databaseService.getUserActiveEntries(walletAddress)
  ]);

  res.json({
    historicalTickets: pgTickets,
    activeTickets: activeEntries
  });
}));

// Get pool tickets
router.get('/pools/:poolId/tickets', catchAsync(async (req, res) => {
  const { poolId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const tickets = await databaseService.getPoolTickets(poolId, {
    page: parseInt(page),
    limit: parseInt(limit)
  });

  res.json(tickets);
}));

// Get draw history
router.get('/draws/:poolId', catchAsync(async (req, res) => {
  const { poolId } = req.params;

  const drawHistory = await databaseService.getDrawHistory(poolId);
  res.json({ draws: drawHistory });
}));

// Get specific draw details
router.get('/draws/:poolId/:drawId', catchAsync(async (req, res) => {
  const { poolId, drawId } = req.params;

  const draw = await databaseService.getDrawDetails(poolId, drawId);
  if (!draw) {
    throw new APIError('Draw not found', 404);
  }

  res.json(draw);
}));

// Get pool statistics
router.get('/pools/:poolId/statistics', catchAsync(async (req, res) => {
  const { poolId } = req.params;
  const stats = await databaseService.getPoolStatistics(poolId);
  res.json(stats);
}));

// Verify ticket
router.get('/verify/:ticketNumber', catchAsync(async (req, res) => {
  const { ticketNumber } = req.params;
  
  const ticket = await databaseService.verifyTicket(ticketNumber);
  if (!ticket) {
    throw new APIError('Ticket not found', 404);
  }

  res.json(ticket);
}));

// Get recent winners
router.get('/winners', catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const winners = await databaseService.getRecentWinners(parseInt(limit));
  res.json({ winners });
}));

// Get user activity
router.get('/activity/:walletAddress', catchAsync(async (req, res) => {
  const { walletAddress } = req.params;
  const { page = 1, limit = 20 } = req.query;

  if (!solanaService.isValidSolanaAddress(walletAddress)) {
    throw new APIError('Invalid wallet address', 400);
  }

  const activity = await databaseService.getUserActivity(walletAddress, {
    page: parseInt(page),
    limit: parseInt(limit)
  });

  res.json(activity);
}));

// Purchase tickets (fallback for non-socket clients)
router.post('/purchase', catchAsync(async (req, res) => {
  const { poolId, walletAddress, quantity } = req.body;

  if (!poolId || !walletAddress || !quantity) {
    throw new APIError('Missing required fields', 400);
  }

  if (!solanaService.isValidSolanaAddress(walletAddress)) {
    throw new APIError('Invalid wallet address', 400);
  }

  const result = await lotteryService.purchaseTickets({
    poolId,
    buyerWallet: walletAddress,
    quantity: parseInt(quantity)
  });

  res.json(result);
}));

// Get transaction status
router.get('/transaction/:signature', catchAsync(async (req, res) => {
  const { signature } = req.params;
  
  const status = await solanaService.verifyTransaction(signature);
  res.json({ status });
}));

// Get global statistics
router.get('/statistics', catchAsync(async (req, res) => {
  const stats = await databaseService.getGlobalStatistics();
  res.json(stats);
}));

module.exports = router;
