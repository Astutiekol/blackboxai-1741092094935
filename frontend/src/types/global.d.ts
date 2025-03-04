/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="node" />
/// <reference types="jest" />

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

declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: any;
  export default content;
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_API_URL: string;
    REACT_APP_SOCKET_URL: string;
    REACT_APP_SOLANA_NETWORK: string;
    REACT_APP_SOLANA_RPC_URL: string;
    [key: string]: string | undefined;
  }
}

declare module 'axios' {
  export interface AxiosError<T = any> extends Error {
    config: any;
    code?: string;
    request?: any;
    response?: {
      data: T;
      status: number;
      statusText: string;
      headers: any;
      config: any;
    };
    isAxiosError: boolean;
  }
}

declare global {
  interface Window {
    solana?: any;
  }
}
