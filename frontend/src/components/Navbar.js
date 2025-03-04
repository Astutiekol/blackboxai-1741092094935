import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

function Navbar() {
  const location = useLocation();
  const { connected, connect, disconnect, balance, publicKey } = useWallet();

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link-active' : 'nav-link';
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.toString().slice(0, 4)}...${address.toString().slice(-4)}`;
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <i className="fas fa-ticket-alt text-2xl text-indigo-600"></i>
              <span className="text-xl font-bold text-gray-800">Solana Lottery</span>
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link to="/" className={isActive('/')}>
                Home
              </Link>
              <Link to="/purchase" className={isActive('/purchase')}>
                Buy Tickets
              </Link>
              <Link to="/draw" className={isActive('/draw')}>
                Live Draw
              </Link>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {connected ? (
              <div className="flex items-center space-x-4">
                <div className="hidden md:block">
                  <div className="text-sm text-gray-600">Balance</div>
                  <div className="font-medium text-indigo-600">{balance.toFixed(4)} SOL</div>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm text-gray-600">Address</div>
                  <div className="font-medium text-indigo-600">{formatAddress(publicKey)}</div>
                </div>
                <button
                  onClick={disconnect}
                  className="wallet-button bg-red-600 hover:bg-red-700"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connect} className="wallet-button">
                <i className="fas fa-wallet mr-2"></i>
                Connect Wallet
              </button>
            )}

            {/* Mobile Menu Button */}
            <button className="md:hidden">
              <i className="fas fa-bars text-2xl text-gray-600"></i>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-indigo-600 hover:bg-gray-50"
            >
              Home
            </Link>
            <Link
              to="/purchase"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-indigo-600 hover:bg-gray-50"
            >
              Buy Tickets
            </Link>
            <Link
              to="/draw"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-indigo-600 hover:bg-gray-50"
            >
              Live Draw
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
