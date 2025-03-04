import React, { createContext, useContext, useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const WalletContext = createContext();

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState(0);
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    // Initialize Solana connection
    const conn = new Connection(
      process.env.REACT_APP_SOLANA_RPC_URL || clusterApiUrl('devnet'),
      'confirmed'
    );
    setConnection(conn);

    // Check if Phantom wallet is available
    const checkPhantomWallet = async () => {
      try {
        const { solana } = window;

        if (solana?.isPhantom) {
          // Attempt auto-connect
          const response = await solana.connect({ onlyIfTrusted: true });
          handleWalletConnection(response);
        }
      } catch (error) {
        console.error('Wallet auto-connect error:', error);
      }
    };

    checkPhantomWallet();
  }, []);

  // Handle wallet connection
  const handleWalletConnection = async (response) => {
    try {
      const walletPublicKey = response.publicKey;
      setPublicKey(walletPublicKey);
      setWallet(window.solana);
      setConnected(true);

      // Fetch initial balance
      await updateBalance(walletPublicKey);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      disconnect();
    }
  };

  // Update wallet balance
  const updateBalance = async (publicKey) => {
    if (connection && publicKey) {
      try {
        const balance = await connection.getBalance(publicKey);
        setBalance(balance / 1e9); // Convert lamports to SOL
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    }
  };

  // Connect wallet
  const connect = async () => {
    try {
      if (!window.solana) {
        alert('Please install Phantom wallet!');
        return;
      }

      const response = await window.solana.connect();
      handleWalletConnection(response);
    } catch (error) {
      console.error('User rejected the connection:', error);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    if (wallet) {
      wallet.disconnect();
    }
    setWallet(null);
    setPublicKey(null);
    setConnected(false);
    setBalance(0);
  };

  // Sign and send transaction
  const signAndSendTransaction = async (transaction) => {
    if (!wallet || !connection) {
      throw new Error('Wallet not connected');
    }

    try {
      // Sign transaction
      const signed = await wallet.signTransaction(transaction);
      
      // Send signed transaction
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      // Confirm transaction
      await connection.confirmTransaction(signature);
      
      // Update balance after transaction
      await updateBalance(publicKey);
      
      return signature;
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  };

  // Value object to be provided to consumers
  const value = {
    wallet,
    publicKey,
    connected,
    balance,
    connection,
    connect,
    disconnect,
    signAndSendTransaction,
    updateBalance,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
