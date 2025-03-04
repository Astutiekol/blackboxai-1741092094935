import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

function LotteryDraw() {
  const { subscribe } = useSocket();
  const [drawState, setDrawState] = useState('waiting'); // waiting, drawing, complete
  const [winningNumbers, setWinningNumbers] = useState([]);
  const [winners, setWinners] = useState([]);
  const [countdown, setCountdown] = useState('');
  const [jackpot, setJackpot] = useState(0);
  const [animation, setAnimation] = useState({
    currentNumber: null,
    isSpinning: false,
  });

  // Subscribe to draw events
  useEffect(() => {
    const unsubscribeDraw = subscribe('draw_start', () => {
      setDrawState('drawing');
      startDrawAnimation();
    });

    const unsubscribeNumber = subscribe('winning_number', (number) => {
      setAnimation((prev) => ({
        ...prev,
        currentNumber: number,
      }));
      setWinningNumbers((prev) => [...prev, number]);
    });

    const unsubscribeResult = subscribe('draw_result', (data) => {
      setDrawState('complete');
      setWinners(data.winners);
      setJackpot(data.nextJackpot);
    });

    return () => {
      unsubscribeDraw();
      unsubscribeNumber();
      unsubscribeResult();
    };
  }, [subscribe]);

  // Countdown timer to next draw
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const nextDraw = new Date();
      nextDraw.setHours(24, 0, 0, 0); // Next draw at midnight

      const difference = nextDraw - now;
      
      if (difference > 0) {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setCountdown(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    const timer = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate number spinning animation
  const startDrawAnimation = () => {
    setAnimation({ currentNumber: null, isSpinning: true });
  };

  // Format wallet address
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Draw Status Card */}
      <div className="card mb-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Lottery Draw
          </h1>
          {drawState === 'waiting' && (
            <>
              <p className="text-xl text-gray-600 mb-4">
                Next draw in: <span className="font-bold">{countdown}</span>
              </p>
              <div className="text-2xl font-bold text-indigo-600 mb-4">
                Current Jackpot: {jackpot.toFixed(2)} SOL
              </div>
            </>
          )}
        </div>
      </div>

      {/* Draw Animation Section */}
      <div className="draw-container p-8 mb-8">
        <div className="text-center">
          {drawState === 'drawing' && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Drawing Numbers</h2>
              <div className="flex justify-center space-x-4">
                {winningNumbers.map((number, index) => (
                  <div
                    key={index}
                    className="w-16 h-16 rounded-full bg-white text-indigo-600 flex items-center justify-center text-2xl font-bold animate-bounce"
                  >
                    {number}
                  </div>
                ))}
                {animation.isSpinning && (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <div className="spinner spinner-primary"></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {drawState === 'complete' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Winning Numbers</h2>
              <div className="flex justify-center space-x-4 mb-8">
                {winningNumbers.map((number, index) => (
                  <div
                    key={index}
                    className="w-16 h-16 rounded-full bg-white text-indigo-600 flex items-center justify-center text-2xl font-bold"
                  >
                    {number}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Winners Section */}
      {drawState === 'complete' && winners.length > 0 && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Congratulations to the Winners!
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prize
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Winner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {winners.map((winner, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {index + 1}
                        {index === 0
                          ? 'st'
                          : index === 1
                          ? 'nd'
                          : index === 2
                          ? 'rd'
                          : 'th'}{' '}
                        Prize
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {formatAddress(winner.address)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-indigo-600">
                        {winner.amount.toFixed(2)} SOL
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Next Draw Info */}
      {drawState === 'complete' && (
        <div className="mt-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Next Draw in {countdown}
          </h3>
          <p className="text-gray-600">
            Don't miss your chance to win the next jackpot of{' '}
            <span className="font-bold text-indigo-600">
              {jackpot.toFixed(2)} SOL
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default LotteryDraw;
