const lotteryService = require('../services/lotteryService');
const databaseService = require('../services/databaseService');
const solanaService = require('../services/solanaService');
const { logger } = require('../config/logger');
const { handleSocketError } = require('../middleware/errorHandler');

function setupSocketHandlers(io) {
  // Store active draws and user subscriptions
  const activeDraws = new Map();
  const userSubscriptions = new Map();

  // Middleware for logging and error handling
  io.use(async (socket, next) => {
    try {
      logger.info(`New socket connection: ${socket.id}`);
      
      // Get wallet address from auth token if provided
      const walletAddress = socket.handshake.auth.walletAddress;
      if (walletAddress) {
        if (!solanaService.isValidSolanaAddress(walletAddress)) {
          throw new Error('Invalid wallet address');
        }
        socket.walletAddress = walletAddress;
        
        // Log user connection
        await databaseService.logActivity({
          activityType: 'SOCKET_CONNECTED',
          walletAddress,
          data: {
            socketId: socket.id,
            userAgent: socket.handshake.headers['user-agent']
          }
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Send initial lottery state
    sendLotteryState(socket);

    // Handle pool subscriptions
    socket.on('subscribe_pool', async (poolId) => {
      try {
        socket.join(`pool_${poolId}`);
        
        if (socket.walletAddress) {
          userSubscriptions.set(socket.id, {
            ...userSubscriptions.get(socket.id),
            [poolId]: true
          });
          
          // Log subscription
          await databaseService.logActivity({
            activityType: 'POOL_SUBSCRIBED',
            walletAddress: socket.walletAddress,
            poolId,
            data: { socketId: socket.id }
          });
        }

        // Send current pool state
        const poolStats = await databaseService.getPoolStatistics(poolId);
        socket.emit('pool_update', { poolId, ...poolStats });

      } catch (error) {
        handleSocketError(error, socket);
      }
    });

    // Handle ticket purchase requests
    socket.on('purchase_tickets', async (data) => {
      try {
        const { poolId, quantity } = data;
        
        if (!socket.walletAddress) {
          throw new Error('Wallet not connected');
        }

        // Process purchase
        const result = await lotteryService.purchaseTickets({
          poolId,
          buyerWallet: socket.walletAddress,
          quantity
        });

        // Emit purchase confirmation
        socket.emit('purchase_confirmation', {
          success: true,
          tickets: result.tickets,
          totalCost: result.totalCost,
          signature: result.signature
        });

        // Broadcast updated pool state
        broadcastPoolUpdate(poolId);

      } catch (error) {
        handleSocketError(error, socket);
        socket.emit('purchase_error', { message: error.message });
      }
    });

    // Handle real-time draw subscriptions
    socket.on('subscribe_draw', async (drawId) => {
      try {
        socket.join(`draw_${drawId}`);
        
        if (socket.walletAddress) {
          // Log subscription
          await databaseService.logActivity({
            activityType: 'DRAW_SUBSCRIBED',
            walletAddress: socket.walletAddress,
            data: { drawId, socketId: socket.id }
          });
        }

        // If draw is active, send current state
        if (activeDraws.has(drawId)) {
          socket.emit('draw_state', activeDraws.get(drawId));
        }

      } catch (error) {
        handleSocketError(error, socket);
      }
    });

    // Handle wallet updates
    socket.on('wallet_connected', async (walletAddress) => {
      try {
        if (!solanaService.isValidSolanaAddress(walletAddress)) {
          throw new Error('Invalid wallet address');
        }

        socket.walletAddress = walletAddress;

        // Log wallet connection
        await databaseService.logActivity({
          activityType: 'WALLET_CONNECTED',
          walletAddress,
          data: { socketId: socket.id }
        });

        // Send user-specific data
        const userTickets = await databaseService.getUserTickets(walletAddress);
        socket.emit('wallet_state', { tickets: userTickets });

      } catch (error) {
        handleSocketError(error, socket);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        logger.info(`Client disconnected: ${socket.id}`);

        // Clean up subscriptions
        if (socket.walletAddress) {
          await databaseService.logActivity({
            activityType: 'SOCKET_DISCONNECTED',
            walletAddress: socket.walletAddress,
            data: { socketId: socket.id }
          });
        }

        userSubscriptions.delete(socket.id);

      } catch (error) {
        logger.error('Error handling disconnect:', error);
      }
    });
  });

  // Helper function to send current lottery state
  async function sendLotteryState(socket) {
    try {
      const [activePools, recentDraws] = await Promise.all([
        databaseService.getActivePools(),
        databaseService.getRecentDraws()
      ]);

      socket.emit('lottery_state', {
        activePools,
        recentDraws,
        timestamp: new Date()
      });
    } catch (error) {
      handleSocketError(error, socket);
    }
  }

  // Helper function to broadcast pool updates
  async function broadcastPoolUpdate(poolId) {
    try {
      const poolStats = await databaseService.getPoolStatistics(poolId);
      io.to(`pool_${poolId}`).emit('pool_update', {
        poolId,
        ...poolStats,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error broadcasting pool update:', error);
    }
  }

  // Helper function to handle draw process
  async function handleDraw(poolId) {
    try {
      // Start draw process
      io.to(`pool_${poolId}`).emit('draw_start', { poolId });

      // Conduct draw
      const result = await lotteryService.conductDraw(poolId);

      // Update active draws map
      activeDraws.set(poolId, {
        status: 'complete',
        ...result
      });

      // Broadcast results
      io.to(`pool_${poolId}`).emit('draw_complete', result);

      // Clean up after delay
      setTimeout(() => {
        activeDraws.delete(poolId);
      }, 3600000); // Clean up after 1 hour

    } catch (error) {
      logger.error('Error handling draw:', error);
      io.to(`pool_${poolId}`).emit('draw_error', {
        message: 'Draw failed'
      });
    }
  }

  // Return cleanup function
  return () => {
    activeDraws.clear();
    userSubscriptions.clear();
  };
}

module.exports = {
  setupSocketHandlers
};
