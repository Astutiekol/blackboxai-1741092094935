const { logger } = require('../config/logger');

// Custom error types
class AppError extends Error {
  constructor(message, code, type = 'APP_ERROR') {
    super(message);
    this.code = code;
    this.type = type;
  }
}

class BlockchainError extends AppError {
  constructor(message, code = 500) {
    super(message, code, 'BLOCKCHAIN_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(message, code = 500) {
    super(message, code, 'DATABASE_ERROR');
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

// Error handler class
class ErrorHandler {
  static async handleError(error, req = null, res = null) {
    try {
      // Log error with context
      logger.error({
        type: error.type || 'UNKNOWN_ERROR',
        message: error.message,
        stack: error.stack,
        code: error.code,
        context: {
          path: req?.path,
          method: req?.method,
          body: req?.body,
          params: req?.params,
          query: req?.query,
          user: req?.user
        }
      });

      // Handle different error types
      if (error instanceof BlockchainError) {
        await this.handleBlockchainError(error);
      } else if (error instanceof DatabaseError) {
        await this.handleDatabaseError(error);
      }

      // If response object exists, send error response
      if (res) {
        this.sendErrorResponse(error, res);
      }

      return {
        success: false,
        error: {
          message: error.message,
          code: error.code
        }
      };
    } catch (handlingError) {
      logger.error('Error in error handler:', handlingError);
      if (res) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  // Handle blockchain-specific errors
  static async handleBlockchainError(error) {
    try {
      // Retry logic for temporary blockchain issues
      if (this.isRetryableBlockchainError(error)) {
        return await this.retryOperation(error.operation, error.params);
      }

      // Revert any pending transactions if needed
      if (error.needsRevert) {
        await this.revertBlockchainTransaction(error.transactionId);
      }
    } catch (handlingError) {
      logger.error('Error handling blockchain error:', handlingError);
    }
  }

  // Handle database-specific errors
  static async handleDatabaseError(error) {
    try {
      // Rollback transaction if needed
      if (error.needsRollback) {
        await this.rollbackDatabaseTransaction(error.transactionId);
      }

      // Attempt data recovery if possible
      if (this.isRecoverableDataError(error)) {
        await this.recoverDatabaseState(error);
      }
    } catch (handlingError) {
      logger.error('Error handling database error:', handlingError);
    }
  }

  // Send formatted error response
  static sendErrorResponse(error, res) {
    const statusCode = error.code || 500;
    const response = {
      success: false,
      error: {
        message: this.getClientSafeMessage(error),
        code: error.code,
        type: error.type
      }
    };

    // Add validation errors if available
    if (error instanceof ValidationError && error.details) {
      response.error.details = error.details;
    }

    res.status(statusCode).json(response);
  }

  // Retry failed operations
  static async retryOperation(operation, params, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await operation(...params);
        return result;
      } catch (error) {
        lastError = error;
        await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
      }
    }
    throw lastError;
  }

  // Get client-safe error message
  static getClientSafeMessage(error) {
    // In production, don't expose internal error details
    if (process.env.NODE_ENV === 'production') {
      return this.getGenericErrorMessage(error);
    }
    return error.message;
  }

  // Get generic error message based on error type
  static getGenericErrorMessage(error) {
    const messages = {
      BLOCKCHAIN_ERROR: 'Blockchain operation failed. Please try again.',
      DATABASE_ERROR: 'Database operation failed. Please try again.',
      VALIDATION_ERROR: 'Invalid input provided.',
      APP_ERROR: 'Operation failed. Please try again.'
    };
    return messages[error.type] || 'An unexpected error occurred.';
  }

  // Check if blockchain error is retryable
  static isRetryableBlockchainError(error) {
    const retryableCodes = ['TimeoutError', 'NetworkError', 'ConnectionError'];
    return retryableCodes.includes(error.code);
  }

  // Check if database error is recoverable
  static isRecoverableDataError(error) {
    const recoverableCodes = ['DeadlockError', 'TimeoutError', 'ConnectionError'];
    return recoverableCodes.includes(error.code);
  }

  // Utility method for delay
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Recovery methods
  static async revertBlockchainTransaction(transactionId) {
    // Implement blockchain transaction reversion
    logger.info(`Reverting blockchain transaction: ${transactionId}`);
  }

  static async rollbackDatabaseTransaction(transactionId) {
    // Implement database transaction rollback
    logger.info(`Rolling back database transaction: ${transactionId}`);
  }

  static async recoverDatabaseState(error) {
    // Implement database state recovery
    logger.info('Attempting database state recovery');
  }

  // Express middleware for error handling
  static middleware() {
    return async (error, req, res, next) => {
      await this.handleError(error, req, res);
    };
  }

  // Socket.io error handler
  static socketErrorHandler(error, socket) {
    this.handleError(error).then(result => {
      socket.emit('error', {
        message: this.getClientSafeMessage(error),
        code: error.code
      });
    });
  }
}

module.exports = {
  ErrorHandler,
  AppError,
  BlockchainError,
  DatabaseError,
  ValidationError
};
