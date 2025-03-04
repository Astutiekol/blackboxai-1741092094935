import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useSocket } from '../contexts/SocketContext';

function TicketPurchase() {
  const navigate = useNavigate();
  const { connected, balance, publicKey, signAndSendTransaction } = useWallet();
  const { socket } = useSocket();

  const [ticketCount, setTicketCount] = useState(1);
  const [ticketPrice, setTicketPrice] = useState(0.1); // Price in SOL
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if wallet not connected
  useEffect(() => {
    if (!connected) {
      navigate('/');
    }
  }, [connected, navigate]);

  // Calculate total cost
  const totalCost = ticketCount * ticketPrice;

  // Handle ticket count change
  const handleTicketCountChange = (e) => {
    const count = parseInt(e.target.value);
    if (count >= 1 && count <= 100) {
      setTicketCount(count);
      setError('');
    }
  };

  // Quick select buttons
  const quickSelect = (count) => {
    setTicketCount(count);
    setError('');
  };

  // Validate purchase
  const validatePurchase = () => {
    if (totalCost > balance) {
      setError('Insufficient balance');
      return false;
    }
    if (ticketCount < 1) {
      setError('Must purchase at least 1 ticket');
      return false;
    }
    return true;
  };

  // Handle ticket purchase
  const handlePurchase = async () => {
    if (!validatePurchase()) return;

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      // Emit purchase request to server
      socket.emit('purchase_tickets', {
        address: publicKey.toString(),
        quantity: ticketCount,
        amount: totalCost,
      });

      // Wait for server response
      const response = await new Promise((resolve, reject) => {
        socket.once('purchase_confirmation', resolve);
        socket.once('purchase_error', reject);
        // Timeout after 30 seconds
        setTimeout(() => reject(new Error('Purchase timeout')), 30000);
      });

      setSuccess('Tickets purchased successfully!');
      // Reset ticket count after successful purchase
      setTicketCount(1);
    } catch (err) {
      setError(err.message || 'Failed to purchase tickets');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Purchase Card */}
      <div className="card mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Purchase Lottery Tickets
        </h1>

        {/* Wallet Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600">Your Balance</div>
              <div className="text-xl font-semibold text-gray-900">
                {balance.toFixed(4)} SOL
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Ticket Price</div>
              <div className="text-xl font-semibold text-indigo-600">
                {ticketPrice} SOL
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Tickets
          </label>
          <div className="flex items-center space-x-4 mb-4">
            <input
              type="number"
              value={ticketCount}
              onChange={handleTicketCountChange}
              min="1"
              max="100"
              className="form-input w-24"
            />
            <div className="flex space-x-2">
              {[1, 5, 10, 25].map((count) => (
                <button
                  key={count}
                  onClick={() => quickSelect(count)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    ticketCount === count
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Purchase Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Price per ticket</span>
            <span className="font-medium">{ticketPrice} SOL</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Number of tickets</span>
            <span className="font-medium">{ticketCount}</span>
          </div>
          <div className="border-t border-gray-200 my-2"></div>
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Cost</span>
            <span className="text-indigo-600">{totalCost.toFixed(4)} SOL</span>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="alert alert-error mb-4">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success mb-4">
            <i className="fas fa-check-circle mr-2"></i>
            {success}
          </div>
        )}

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={isProcessing || !connected}
          className={`btn btn-primary w-full ${
            isProcessing ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing ? (
            <>
              <div className="spinner spinner-primary mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <i className="fas fa-shopping-cart mr-2"></i>
              Purchase Tickets
            </>
          )}
        </button>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <i className="fas fa-info-circle text-indigo-600 mr-2"></i>
            How It Works
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li>• Each ticket costs {ticketPrice} SOL</li>
            <li>• Maximum of 100 tickets per purchase</li>
            <li>• Draws occur daily at midnight UTC</li>
            <li>• Winners are selected randomly on-chain</li>
            <li>• Prizes are distributed automatically</li>
          </ul>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <i className="fas fa-shield-alt text-indigo-600 mr-2"></i>
            Security & Fairness
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li>• Fully decentralized on Solana blockchain</li>
            <li>• Transparent random number generation</li>
            <li>• Verifiable on-chain transactions</li>
            <li>• Smart contract audited for security</li>
            <li>• Immediate prize distribution</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TicketPurchase;
