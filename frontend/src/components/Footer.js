import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <i className="fas fa-ticket-alt text-2xl text-indigo-600"></i>
              <span className="text-xl font-bold text-gray-800">Solana Lottery</span>
            </div>
            <p className="text-gray-600 mb-4">
              A decentralized lottery platform built on the Solana blockchain.
              Transparent, secure, and fair gaming for everyone.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <i className="fab fa-discord text-xl"></i>
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <i className="fab fa-github text-xl"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gray-800 font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-600 hover:text-indigo-600 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/purchase" className="text-gray-600 hover:text-indigo-600 transition-colors">
                  Buy Tickets
                </Link>
              </li>
              <li>
                <Link to="/draw" className="text-gray-600 hover:text-indigo-600 transition-colors">
                  Live Draw
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-gray-800 font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://docs.solana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  FAQs
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm">
              © {currentYear} Solana Lottery. All rights reserved.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a
                href="#"
                className="text-gray-600 hover:text-indigo-600 transition-colors text-sm"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-indigo-600 transition-colors text-sm"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-indigo-600 transition-colors text-sm"
              >
                Security
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
