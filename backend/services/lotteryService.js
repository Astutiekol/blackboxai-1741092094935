const databaseService = require('./databaseService');
const solanaService = require('./solanaService');
const { logger } = require('../config/logger');

class LotteryService {
  constructor() {
    this.ticketPrice = parseFloat(process.env.TICKET_PRICE) || 0.1;
    this.minJackpot = parseFloat(process.env.MIN_JACKPOT) || 1000;
    this.maxTicketsPerPurchase = parseInt(process.env.MAX_TICKETS_PER_PURCHASE) || 100;
  }

  // Create a new lottery pool
  async createPool(poolData) {
    try {
      // Validate creator's wallet
      if (!solanaService.isValidSolanaAddress(poolData.creatorWallet)) {
        throw new Error('Invalid creator wallet address');
      }

      // Get or create user
      let user = await databaseService.getUserByWallet(poolData.creatorWallet);
      if (!user) {
        user = await databaseService.createUser(poolData.creatorWallet);
      }

      // Create pool on Solana blockchain
      const { poolAddress, transaction } = await solanaService.createLotteryPool({
        creator: poolData.creatorWallet,
        ticketPrice: this.ticketPrice,
        minPlayers: poolData.minPlayers,
        maxPlayers: poolData.maxPlayers
      });

      // Create pool in database
      const pool = await databaseService.createLotteryPool({
        poolAddress,
        creatorId: user.id,
        name: poolData.name,
        description: poolData.description,
        ticketPrice: this.ticketPrice,
        minPlayers: poolData.minPlayers,
        maxPlayers: poolData.maxPlayers,
        startTime: poolData.startTime,
        endTime: poolData.endTime
      });

      // Log activity
      await databaseService.logActivity({
        activityType: 'POOL_CREATED',
        walletAddress: poolData.creatorWallet,
        poolId: pool.id,
        data: { poolAddress, transaction }
      });

      return { pool, transaction };
    } catch (error) {
      logger.error('Error creating lottery pool:', error);
      throw error;
    }
  }

  // Purchase lottery tickets
  async purchaseTickets(purchaseData) {
    try {
      const {
        poolId,
        buyerWallet,
        quantity
      } = purchaseData;

      // Validate input
      if (quantity > this.maxTicketsPerPurchase) {
        throw new Error(`Maximum ${this.maxTicketsPerPurchase} tickets per purchase`);
      }

      // Get or create user
      let user = await databaseService.getUserByWallet(buyerWallet);
      if (!user) {
        user = await databaseService.createUser(buyerWallet);
      }

      // Calculate total cost
      const totalCost = quantity * this.ticketPrice;

      // Create transaction on Solana
      const { transaction, signature } = await solanaService.purchaseTickets(
        buyerWallet,
        quantity,
        totalCost
      );

      // Record transaction in PostgreSQL
      const dbTransaction = await databaseService.createTransaction({
        poolId,
        userId: user.id,
        signature,
        amount: totalCost,
        type: 'purchase'
      });

      // Generate ticket numbers
      const tickets = Array.from({ length: quantity }, () => ({
        ticketNumber: this.generateTicketNumber(),
        purchaseTimestamp: new Date(),
        transactionSignature: signature
      }));

      // Update MongoDB pool entry
      await databaseService.updatePoolEntry(poolId, buyerWallet, tickets);

      // Update real-time stats
      await databaseService.updateRealTimeStats(poolId, {
        $inc: {
          activeParticipants: 1,
          totalTicketsSold: quantity,
          currentPrizePool: totalCost
        }
      });

      // Queue notification
      await databaseService.queueNotification({
        recipient: buyerWallet,
        type: 'TICKET_PURCHASE',
        content: {
          title: 'Tickets Purchased Successfully',
          body: `You have purchased ${quantity} tickets for the lottery pool`,
          data: { poolId, quantity, totalCost }
        },
        scheduledFor: new Date()
      });

      return {
        transaction,
        tickets,
        totalCost,
        signature
      };
    } catch (error) {
      logger.error('Error purchasing tickets:', error);
      throw error;
    }
  }

  // Conduct lottery draw
  async conductDraw(poolId) {
    try {
      // Get pool details
      const pool = await databaseService.getPoolById(poolId);
      if (!pool) {
        throw new Error('Pool not found');
      }

      // Get participants from MongoDB
      const entries = await databaseService.getPoolEntries(poolId);
      if (entries.length === 0) {
        throw new Error('No participants in the pool');
      }

      // Generate winning numbers on Solana
      const { winningNumbers, drawTransaction } = await solanaService.drawLottery(poolId);

      // Determine winners
      const winners = this.determineWinners(entries, winningNumbers, pool.prize_amount);

      // Create draw history in MongoDB
      const drawHistory = await databaseService.createDrawHistory({
        drawId: `${poolId}-${Date.now()}`,
        poolId,
        drawTimestamp: new Date(),
        winningNumbers,
        winners,
        drawTransaction,
        totalPrizePool: pool.prize_amount,
        participants: entries.length
      });

      // Distribute prizes on Solana
      const prizeTransactions = await solanaService.distributePrizes(winners);

      // Update PostgreSQL records
      await databaseService.updatePoolStatus(poolId, 'completed', winners[0]?.walletAddress);

      // Queue notifications for winners
      await Promise.all(winners.map(winner =>
        databaseService.queueNotification({
          recipient: winner.walletAddress,
          type: 'PRIZE_WON',
          content: {
            title: 'Congratulations! You Won!',
            body: `You won ${winner.prize} SOL in the lottery draw`,
            data: { poolId, prize: winner.prize }
          },
          scheduledFor: new Date()
        })
      ));

      return {
        drawHistory,
        winners,
        transactions: prizeTransactions
      };
    } catch (error) {
      logger.error('Error conducting draw:', error);
      throw error;
    }
  }

  // Get pool statistics
  async getPoolStatistics(poolId) {
    try {
      const stats = await databaseService.getPoolStatistics(poolId);
      return stats;
    } catch (error) {
      logger.error('Error getting pool statistics:', error);
      throw error;
    }
  }

  // Helper method to generate unique ticket number
  generateTicketNumber() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper method to determine winners
  determineWinners(entries, winningNumbers, prizePool) {
    // Implementation would match winning numbers with ticket numbers
    // This is a simplified version
    const winners = entries
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((entry, index) => ({
        walletAddress: entry.walletAddress,
        ticketNumber: entry.tickets[0].ticketNumber,
        prize: prizePool * [0.7, 0.2, 0.1][index], // Prize distribution
        transactionSignature: null // To be filled after prize distribution
      }));

    return winners;
  }
}

module.exports = new LotteryService();
