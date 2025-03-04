import { toast } from 'react-toastify';

// Error types
export enum ErrorType {
  BLOCKCHAIN = 'BLOCKCHAIN_ERROR',
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  WALLET = 'WALLET_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

// Error interface
interface AppError {
  message: string;
  code: number;
  type: ErrorType;
  details?: any;
}

class ErrorHandler {
  // Handle API errors
  static async handleApiError(error: any): Promise<AppError> {
    let processedError: AppError = {
      message: 'An unexpected error occurred',
      code: 500,
      type: ErrorType.UNKNOWN
    };

    try {
      if (error.response) {
        // Server responded with error
        processedError = {
          message: error.response.data.error.message,
          code: error.response.status,
          type: error.response.data.error.type,
          details: error.response.data.error.details
        };
      } else if (error.request) {
        // Request made but no response
        processedError = {
          message: 'Network error. Please check your connection.',
          code: 0,
          type: ErrorType.NETWORK
        };
      }

      // Show error toast
      this.showErrorToast(processedError);

      // Log error if needed
      if (process.env.NODE_ENV !== 'production') {
        console.error('API Error:', error);
      }

      return processedError;
    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      return processedError;
    }
  }

  // Handle blockchain errors
  static async handleBlockchainError(error: any): Promise<AppError> {
    const processedError: AppError = {
      message: this.getBlockchainErrorMessage(error),
      code: 500,
      type: ErrorType.BLOCKCHAIN
    };

    // Show error toast
    this.showErrorToast(processedError);

    // Log blockchain error
    if (process.env.NODE_ENV !== 'production') {
      console.error('Blockchain Error:', error);
    }

    return processedError;
  }

  // Handle wallet errors
  static async handleWalletError(error: any): Promise<AppError> {
    const processedError: AppError = {
      message: this.getWalletErrorMessage(error),
      code: 500,
      type: ErrorType.WALLET
    };

    // Show error toast
    this.showErrorToast(processedError);

    return processedError;
  }

  // Handle validation errors
  static handleValidationError(error: any): AppError {
    const processedError: AppError = {
      message: error.message || 'Validation failed',
      code: 400,
      type: ErrorType.VALIDATION,
      details: error.details
    };

    // Show error toast
    this.showErrorToast(processedError);

    return processedError;
  }

  // Show error toast
  private static showErrorToast(error: AppError) {
    toast.error(error.message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    });
  }

  // Get blockchain-specific error message
  private static getBlockchainErrorMessage(error: any): string {
    const errorMessages: { [key: string]: string } = {
      'insufficient balance': 'Insufficient balance in your wallet',
      'user rejected': 'Transaction was rejected by user',
      'pool full': 'The pool is currently full',
      'insufficient points': 'Insufficient points for redemption'
    };

    // Check for known error patterns
    for (const [pattern, message] of Object.entries(errorMessages)) {
      if (error.message?.toLowerCase().includes(pattern)) {
        return message;
      }
    }

    return 'Blockchain operation failed. Please try again.';
  }

  // Get wallet-specific error message
  private static getWalletErrorMessage(error: any): string {
    const errorMessages: { [key: string]: string } = {
      'wallet not found': 'Please install a Solana wallet',
      'user rejected': 'Connection request was rejected',
      'already connected': 'Wallet is already connected',
      'not connected': 'Please connect your wallet first'
    };

    // Check for known error patterns
    for (const [pattern, message] of Object.entries(errorMessages)) {
      if (error.message?.toLowerCase().includes(pattern)) {
        return message;
      }
    }

    return 'Wallet operation failed. Please try again.';
  }

  // Retry failed operations with exponential backoff
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw lastError;
  }

  // Create error boundary component
  static ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <div className="error-boundary">
        try {
          {children}
        } catch (error) {
          return (
            <div className="error-fallback">
              <h2>Something went wrong</h2>
              <p>Please refresh the page or try again later.</p>
            </div>
          );
        }
      </div>
    );
  };
}

// Error boundary HOC
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorHandler.ErrorBoundary>
        <Component {...props} />
      </ErrorHandler.ErrorBoundary>
    );
  };
}

export default ErrorHandler;
