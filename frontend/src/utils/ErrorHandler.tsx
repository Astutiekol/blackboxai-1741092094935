import * as React from 'react';
import { Component, ReactNode } from 'react';
import type { ErrorInfo } from 'react';
import { toast } from 'react-toastify';

declare const process: {
  env: {
    NODE_ENV: 'development' | 'production' | 'test';
  };
};

// Environment configuration
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
import 'react-toastify/dist/ReactToastify.css';
import axios, { AxiosError } from 'axios';

// Error types
export enum ErrorType {
  BLOCKCHAIN = 'BLOCKCHAIN_ERROR',
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  WALLET = 'WALLET_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

// Error interface
export interface AppError {
  message: string;
  code: number;
  type: ErrorType;
  details?: unknown;
}

// Error boundary props and state
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Error boundary component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    this.handleReset = this.handleReset.bind(this);
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error caught by boundary:', error, info);
  }

  private handleReset(): void {
    this.setState({ hasError: false, error: undefined });
  }

  public render(): ReactNode {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return fallback || (
        <div className="error-fallback p-4 bg-red-50 rounded-lg">
          <h2 className="text-xl font-bold text-red-700 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600">
            Please refresh the page or try again later.
          </p>
          <button
            onClick={this.handleReset}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            type="button"
          >
            Try Again
          </button>
        </div>
      );
    }

    return children;
  }
}

export class ErrorHandler {
  private static readonly toastConfig = {
    position: 'top-right' as const,
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  };

  // Handle API errors
  public static async handleApiError(error: unknown): Promise<AppError> {
    let processedError: AppError = {
      message: 'An unexpected error occurred',
      code: 500,
      type: ErrorType.UNKNOWN
    };

    try {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ error?: { message?: string; type?: string; details?: unknown } }>;
        if (axiosError.response) {
          processedError = {
            message: axiosError.response.data?.error?.message || axiosError.message,
            code: axiosError.response.status,
            type: (axiosError.response.data?.error?.type as ErrorType) || ErrorType.UNKNOWN,
            details: axiosError.response.data?.error?.details
          };
        } else if (axiosError.request) {
          processedError = {
            message: 'Network error. Please check your connection.',
            code: 0,
            type: ErrorType.NETWORK
          };
        }
      }

      this.showErrorToast(processedError);

      const nodeEnv = process.env.NODE_ENV || 'development';
      if (nodeEnv === 'development') {
        console.error('API Error:', error);
      }

      return processedError;
    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      return processedError;
    }
  }

  // Handle blockchain errors
  public static async handleBlockchainError(error: unknown): Promise<AppError> {
    const processedError: AppError = {
      message: this.getBlockchainErrorMessage(error),
      code: 500,
      type: ErrorType.BLOCKCHAIN
    };

    this.showErrorToast(processedError);

    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'development') {
      console.error('Blockchain Error:', error);
    }

    return processedError;
  }

  // Handle wallet errors
  public static async handleWalletError(error: unknown): Promise<AppError> {
    const processedError: AppError = {
      message: this.getWalletErrorMessage(error),
      code: 500,
      type: ErrorType.WALLET
    };

    this.showErrorToast(processedError);

    return processedError;
  }

  // Handle validation errors
  public static handleValidationError(error: { message?: string; details?: unknown }): AppError {
    const processedError: AppError = {
      message: error.message || 'Validation failed',
      code: 400,
      type: ErrorType.VALIDATION,
      details: error.details
    };

    this.showErrorToast(processedError);

    return processedError;
  }

  // Show error toast
  private static showErrorToast(error: AppError): void {
    toast.error(error.message, this.toastConfig);
  }

  // Get blockchain-specific error message
  private static getBlockchainErrorMessage(error: unknown): string {
    const errorMessages: Record<string, string> = {
      'insufficient balance': 'Insufficient balance in your wallet',
      'user rejected': 'Transaction was rejected by user',
      'pool full': 'The pool is currently full',
      'insufficient points': 'Insufficient points for redemption'
    };

    const errorMessage = this.getErrorMessage(error);

    for (const [pattern, message] of Object.entries(errorMessages)) {
      if (errorMessage.toLowerCase().includes(pattern)) {
        return message;
      }
    }

    return 'Blockchain operation failed. Please try again.';
  }

  // Get wallet-specific error message
  private static getWalletErrorMessage(error: unknown): string {
    const errorMessages: Record<string, string> = {
      'wallet not found': 'Please install a Solana wallet',
      'user rejected': 'Connection request was rejected',
      'already connected': 'Wallet is already connected',
      'not connected': 'Please connect your wallet first'
    };

    const errorMessage = this.getErrorMessage(error);

    for (const [pattern, message] of Object.entries(errorMessages)) {
      if (errorMessage.toLowerCase().includes(pattern)) {
        return message;
      }
    }

    return 'Wallet operation failed. Please try again.';
  }

  // Retry failed operations with exponential backoff
  public static async retry<T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  // Get error message from unknown error
  private static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return String(error);
  }
}

// HOC for error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
