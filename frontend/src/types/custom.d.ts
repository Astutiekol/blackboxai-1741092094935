declare module 'react-toastify' {
  import { ReactNode } from 'react';

  export interface ToastOptions {
    position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
    autoClose?: number | false;
    hideProgressBar?: boolean;
    closeOnClick?: boolean;
    pauseOnHover?: boolean;
    draggable?: boolean;
    progress?: number | undefined;
  }

  export const toast: {
    error(message: string, options?: ToastOptions): void;
    success(message: string, options?: ToastOptions): void;
    info(message: string, options?: ToastOptions): void;
    warn(message: string, options?: ToastOptions): void;
  };
}
