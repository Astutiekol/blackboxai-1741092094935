const { pgPool, executeQuery, withTransaction } = require('../config/db');
const {
  PoolEntry,
  DrawHistory,
  ActivityLog,
  RealTimeStats,
  NotificationQueue
} = require('../models/mongodb/schemas');
const { logger } = require('../config/logger');

class DatabaseService {
  // PostgreSQL Operations
  
  // User Operations
  async createUser(walletAddress) {
    try {
      const query = `
        INSERT INTO users (wallet_address)
        VALUES ($1)
        RETURNING id, wallet_address, created_at
      `;
      const result = await executeQuery(query, [walletAddress]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByWallet(walletAddress) {
    try {
      const query = `
        SELECT * FROM users
        WHERE wallet_address = $1
      `;
      const result = await executeQuery(query, [walletAddress]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user:', error);
      throw error;
    }
  }

  // Pool Operations
  async createLotteryPool(poolData) {
    try {
      const {
        poolAddress,
        creatorId,
        name,
        description,
        ticketPrice,
        minPlayers,
        maxPlayers,
        startTime,
        endTime
      } = poolData;

      return await withTransaction(async (client) => {
        // Insert into PostgreSQL
        const pgQuery = `
          INSERT INTO lottery_pools (
            pool_address, creator_id, name, description,
            ticket_price, min_players, max_players,
            start_time, end_time, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
          RETURNING *
        `;
        const pgResult = await client.query(pgQuery, [
          poolAddress, creatorId, name, description,
          ticketPrice, minPlayers, maxPlayers,
          startTime, endTime
        ]);

        // Initialize MongoDB real-time stats
        await RealTimeStats.create({
          poolId: pgResult.rows[0].id,
          currentPrizePool: 0,
          activeParticipants: 0,
          totalTicketsSold: 0
        });

        return pgResult.rows[0];
      });
    } catch (error) {
      logger.error('Error creating lottery pool:', error);
      throw error;
    }
  }

  async getActivePools() {
    try {
      const query = 'SELECT * FROM active_pools';
      const result = await executeQuery(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting active pools:', error);
      throw error;
    }
  }

  // Transaction Operations
  async createTransaction(transactionData) {
    try {
      const {
        poolId,
        userId,
        signature,
        amount,
        type
      } = transactionData;

      return await withTransaction(async (client) => {
        const query = `
          INSERT INTO transactions (
            pool_id, user_id, signature,
            amount, type, status
          )
          VALUES ($1, $2, $3, $4, $5, 'pending')
          RETURNING *
        `;
        const result = await client.query(query, [
          poolId, userId, signature, amount, type
        ]);
        return result.rows[0];
      });
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  async confirmTransaction(signature) {
    try {
      return await withTransaction(async (client) => {
        const query = `
          UPDATE transactions
          SET status = 'confirmed',
              confirmed_at = CURRENT_TIMESTAMP
          WHERE signature = $1
          RETURNING *
        `;
        const result = await client.query(query, [signature]);
        return result.rows[0];
      });
    } catch (error) {
      logger.error('Error confirming transaction:', error);
      throw error;
    }
  }

  // MongoDB Operations

  // Pool Entry Operations
  async createPoolEntry(entryData) {
    try {
      const entry = new PoolEntry(entryData);
      await entry.save();
      return entry;
    } catch (error) {
      logger.error('Error creating pool entry:', error);
      throw error;
    }
  }

  async updatePoolEntry(poolId, walletAddress, ticketData) {
    try {
      const result = await PoolEntry.findOneAndUpdate(
        { poolId, walletAddress },
        {
          $push: { tickets: ticketData },
          $inc: { totalTickets: 1 },
          lastUpdated: new Date()
        },
        { new: true, upsert: true }
      );
      return result;
    } catch (error) {
      logger.error('Error updating pool entry:', error);
      throw error;
    }
  }

  // Draw History Operations
  async createDrawHistory(drawData) {
    try {
      const draw = new DrawHistory(drawData);
      await draw.save();
      return draw;
    } catch (error) {
      logger.error('Error creating draw history:', error);
      throw error;
    }
  }

  // Activity Logging
  async logActivity(activityData) {
    try {
      const activity = new ActivityLog(activityData);
      await activity.save();
      return activity;
    } catch (error) {
      logger.error('Error logging activity:', error);
      throw error;
    }
  }

  // Real-time Stats Operations
  async updateRealTimeStats(poolId, updateData) {
    try {
      const stats = await RealTimeStats.findOneAndUpdate(
        { poolId },
        {
          $set: updateData,
          lastUpdated: new Date()
        },
        { new: true, upsert: true }
      );
      return stats;
    } catch (error) {
      logger.error('Error updating real-time stats:', error);
      throw error;
    }
  }

  // Notification Operations
  async queueNotification(notificationData) {
    try {
      const notification = new NotificationQueue(notificationData);
      await notification.save();
      return notification;
    } catch (error) {
      logger.error('Error queueing notification:', error);
      throw error;
    }
  }

  // Aggregate Operations
  async getPoolStatistics(poolId) {
    try {
      const [pgStats, mongoStats] = await Promise.all([
        // Get PostgreSQL stats
        executeQuery(`
          SELECT 
            COUNT(DISTINCT t.user_id) as total_players,
            COUNT(t.id) as total_tickets,
            SUM(tr.amount) as total_volume
          FROM lottery_pools lp
          LEFT JOIN tickets t ON t.pool_id = lp.id
          LEFT JOIN transactions tr ON tr.pool_id = lp.id
          WHERE lp.id = $1
        `, [poolId]),
        // Get MongoDB real-time stats
        RealTimeStats.findOne({ poolId })
      ]);

      return {
        ...pgStats.rows[0],
        realTimeStats: mongoStats
      };
    } catch (error) {
      logger.error('Error getting pool statistics:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseService();
