import React from 'react';
import { motion } from 'framer-motion';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Settings, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const location = useLocation();
  const onSettings = location.pathname === '/settings';

  return (
    <motion.header 
      className="bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-700 px-6 py-4"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Logo size="md" className="animate-float" />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              Slash / MCP
            </h1>
            <p className="text-sm text-gray-600 dark:text-dark-400">
              Model Context Protocol Client
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {onSettings ? (
            <Link to="/chat">
              <motion.div
                className="p-2 rounded-lg bg-gray-100 dark:bg-dark-800 hover:shadow-glow dark:hover:shadow-glow-dark transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Home className="w-5 h-5 text-gray-600 dark:text-dark-300" />
              </motion.div>
            </Link>
          ) : (
            <Link to="/settings">
              <motion.div
                className="p-2 rounded-lg bg-gray-100 dark:bg-dark-800 hover:shadow-glow dark:hover:shadow-glow-dark transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-dark-300" />
              </motion.div>
            </Link>
          )}
          
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
};