import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LotteryHome from './components/LotteryHome';
import TicketPurchase from './components/TicketPurchase';
import LotteryDraw from './components/LotteryDraw';
import { SocketProvider } from './contexts/SocketContext';
import { WalletProvider } from './contexts/WalletContext';
import './App.css';

function App() {
  return (
    <WalletProvider>
      <SocketProvider>
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
          <Navbar />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<LotteryHome />} />
              <Route path="/purchase" element={<TicketPurchase />} />
              <Route path="/draw" element={<LotteryDraw />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </SocketProvider>
    </WalletProvider>
  );
}

export default App;
