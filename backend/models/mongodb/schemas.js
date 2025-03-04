const mongoose = require('mongoose');

// Pool Entry Schema - For active pool entries and real-time updates
const PoolEntrySchema = new mongoose.Schema({
  poolId: {
    type: String,
    required: true,
    index: true
  },
  walletAddress: {
    type: String,
    required: true,
    index: true
  },
  tickets: [{
    ticketNumber: String,
    purchaseTimestamp: Date,
    transactionSignature: String
  }],
  totalTickets: {
    type: Number,
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Draw History Schema - For storing detailed draw results
const DrawHistorySchema = new mongoose.Schema({
  drawId: {
    type: String,
    required: true,
    unique: true
  },
  poolId: {
    type: String,
    required: true,
    index: true
  },
  drawTimestamp: {
    type: Date,
    required: true
  },
  winningNumbers: [{
    type: Number
  }],
  winners: [{
    walletAddress: String,
    prize: Number,
    ticketNumber: String,
    transactionSignature: String,
    claimedAt: Date
  }],
  drawTransaction: {
    signature: String,
    blockTime: Number,
    slot: Number
  },
  totalPrizePool: {
    type: Number,
    required: true
  },
  participants: {
    type: Number,
    required: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
});

// Activity Log Schema - For tracking user activities and system events
const ActivityLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  activityType: {
    type: String,
    required: true,
    index: true
  },
  walletAddress: {
    type: String,
    index: true
  },
  poolId: {
    type: String,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    region: String
  }
});

// Real-time Stats Schema - For caching and real-time analytics
const RealTimeStatsSchema = new mongoose.Schema({
  poolId: {
    type: String,
    required: true,
    unique: true
  },
  activeParticipants: {
    type: Number,
    default: 0
  },
  totalTicketsSold: {
    type: Number,
    default: 0
  },
  currentPrizePool: {
    type: Number,
    default: 0
  },
  lastTicketPurchase: Date,
  ticketsSoldLast24h: {
    type: Number,
    default: 0
  },
  participantsLast24h: {
    type: Number,
    default: 0
  },
  hourlyStats: [{
    hour: Date,
    tickets: Number,
    participants: Number,
    volume: Number
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Notification Queue Schema - For managing user notifications
const NotificationQueueSchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  content: {
    title: String,
    body: String,
    data: mongoose.Schema.Types.Mixed
  },
  scheduledFor: {
    type: Date,
    required: true,
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes
PoolEntrySchema.index({ poolId: 1, walletAddress: 1 }, { unique: true });
DrawHistorySchema.index({ drawTimestamp: -1 });
ActivityLogSchema.index({ timestamp: -1 });
RealTimeStatsSchema.index({ lastUpdated: -1 });
NotificationQueueSchema.index({ status: 1, scheduledFor: 1 });

// Add pre-save middleware for updating timestamps
PoolEntrySchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

RealTimeStatsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Create models
const PoolEntry = mongoose.model('PoolEntry', PoolEntrySchema);
const DrawHistory = mongoose.model('DrawHistory', DrawHistorySchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
const RealTimeStats = mongoose.model('RealTimeStats', RealTimeStatsSchema);
const NotificationQueue = mongoose.model('NotificationQueue', NotificationQueueSchema);

module.exports = {
  PoolEntry,
  DrawHistory,
  ActivityLog,
  RealTimeStats,
  NotificationQueue
};
