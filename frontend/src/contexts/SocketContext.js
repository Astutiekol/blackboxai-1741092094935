import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(process.env.REACT_APP_SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Socket event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socketInstance.on('lottery_update', (data) => {
      console.log('Lottery update received:', data);
      setLastMessage(data);
    });

    socketInstance.on('draw_result', (data) => {
      console.log('Draw result received:', data);
      setLastMessage(data);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Set socket instance
    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Value object to be provided to consumers
  const value = {
    socket,
    connected,
    lastMessage,
    // Helper methods
    emit: (event, data) => {
      if (socket && connected) {
        socket.emit(event, data);
      }
    },
    subscribe: (event, callback) => {
      if (socket) {
        socket.on(event, callback);
        return () => socket.off(event, callback);
      }
      return () => {};
    },
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
