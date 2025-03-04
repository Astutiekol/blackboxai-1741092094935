import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useWallet } from '../contexts/WalletContext';

function LotteryHome() {
  const { connected: walletConnected } = useWallet();
  const { lastMessage, subscribe } = useSocket();
  const [currentJackpot, setCurrentJackpot] = useState(1000); // Default jackpot in SOL
  const [timeRemaining, setTimeRemaining] = useState('');
  const [recentWinners, setRecentWinners] = useState([]);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    ticketsSold: 0,
    averageWinning: 0,
  });

  // Update lottery information when socket message received
  useEffect(() => {
    if (lastMessage?.type === 'lottery_update') {
      setCurrentJackpot(lastMessage.jackpot);
      setStats({
        totalPlayers: lastMessage.totalPlayers,
        ticketsSold: lastMessage.ticketsSold,
        averageWinning: lastMessage.averageWinning,
      });
    }
  }, [lastMessage]);

  // Subscribe to lottery updates
  useEffect(() => {
    const unsubscribe = subscribe('lottery_update', (data) => {
      console.log('Received lottery update:', data);
    });

    return () => unsubscribe();
  }, [subscribe]);

  // Countdown timer
  useEffect(() => {
    const drawTime = new Date();
    drawTime.setHours(24, 0, 0, 0); // Next draw at midnight

    const timer = setInterval(() => {
      const now = new Date();
      const difference = drawTime - now;

      if (difference > 0) {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeRemaining(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Win Big with <span className="text-indigo-600">Solana Lottery</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          The most transparent and fair lottery system on the Solana blockchain.
        </p>
        <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-6">
          <Link
            to="/purchase"
            className="btn btn-primary text-lg px-8 py-3 flex items-center"
          >
            <i className="fas fa-ticket-alt mr-2"></i>
            Buy Tickets Now
          </Link>
          <a
            href="#how-it-works"
            className="btn bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50 text-lg px-8 py-3 flex items-center"
          >
            <i className="fas fa-info-circle mr-2"></i>
            How It Works
          </a>
        </div>
      </div>

      {/* Current Jackpot Card */}
      <div className="card bg-gradient-to-r from-indigo-500 to-purple-600 text-white mb-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Current Jackpot</h2>
          <div className="text-5xl md:text-6xl font-bold mb-4">
            {currentJackpot.toFixed(2)} SOL
          </div>
          <div className="text-xl mb-6">Next draw in: {timeRemaining}</div>
          {!walletConnected && (
            <div className="text-sm bg-white/10 rounded-lg p-4 mb-4">
              Connect your wallet to participate in the lottery
            </div>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="card text-center">
          <i className="fas fa-users text-4xl text-indigo-600 mb-4"></i>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.totalPlayers}
          </div>
          <div className="text-gray-600">Total Players</div>
        </div>
        <div className="card text-center">
          <i className="fas fa-ticket-alt text-4xl text-indigo-600 mb-4"></i>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.ticketsSold}
          </div>
          <div className="text-gray-600">Tickets Sold</div>
        </div>
        <div className="card text-center">
          <i className="fas fa-trophy text-4xl text-indigo-600 mb-4"></i>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.averageWinning.toFixed(2)} SOL
          </div>
          <div className="text-gray-600">Average Winning</div>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card">
            <div className="text-center mb-4">
              <i className="fas fa-wallet text-4xl text-indigo-600"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
              1. Connect Wallet
            </h3>
            <p className="text-gray-600 text-center">
              Connect your Solana wallet to participate in the lottery
            </p>
          </div>
          <div className="card">
            <div className="text-center mb-4">
              <i className="fas fa-ticket-alt text-4xl text-indigo-600"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
              2. Buy Tickets
            </h3>
            <p className="text-gray-600 text-center">
              Purchase tickets using SOL. Each ticket has an equal chance of winning
            </p>
          </div>
          <div className="card">
            <div className="text-center mb-4">
              <i className="fas fa-gift text-4xl text-indigo-600"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
              3. Win Prizes
            </h3>
            <p className="text-gray-600 text-center">
              Winners are selected randomly and prizes are distributed automatically
            </p>
          </div>
        </div>
      </div>

      {/* Recent Winners Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Recent Winners
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Winner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prize
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentWinners.map((winner, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {winner.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {winner.address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {winner.prize} SOL
                  </td>
                </tr>
              ))}
              {recentWinners.length === 0 && (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                  >
                    No recent winners
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to Try Your Luck?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Join thousands of players and win big with Solana Lottery!
        </p>
        <Link
          to="/purchase"
          className="btn btn-primary text-lg px-8 py-3 inline-flex items-center"
        >
          <i className="fas fa-ticket-alt mr-2"></i>
          Get Your Tickets
        </Link>
      </div>
    </div>
  );
}

export default LotteryHome;
