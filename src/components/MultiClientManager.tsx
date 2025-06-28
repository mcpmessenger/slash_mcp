import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X as Close, Circle, Trash2 } from 'lucide-react';
import { useMCP } from '../context/MCPContext';

interface MultiClientManagerProps {
  onClose: () => void;
}

export const MultiClientManager: React.FC<MultiClientManagerProps> = ({ onClose }) => {
  const { connections, connect, disconnect } = useMCP();
  const [newUrl, setNewUrl] = useState('ws://localhost:8080');

  const handleAddClient = () => {
    if (!newUrl.trim()) return;
    connect(newUrl);
    setNewUrl('');
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full sm:w-96 h-full bg-white dark:bg-dark-900 shadow-lg border-l border-gray-200 dark:border-dark-700 flex flex-col"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Clients</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-800"
            >
              <Close className="w-4 h-4 text-gray-600 dark:text-dark-300" />
            </button>
          </div>

          {/* Add client */}
          <div className="p-4 flex space-x-2 border-b border-gray-200 dark:border-dark-700">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="ws://server:port"
              className="flex-1 px-3 py-2 rounded bg-gray-100 dark:bg-dark-800 border border-gray-300 dark:border-dark-600 text-sm"
            />
            <button
              onClick={handleAddClient}
              className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Client list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between p-3 bg-gray-100 dark:bg-dark-800 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Circle
                    className={`w-3 h-3 ${conn.status === 'connected' ? 'text-green-500' : 'text-red-500'}`}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-white">
                      {conn.server.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-dark-400">{conn.id}</div>
                  </div>
                </div>
                <button
                  onClick={() => disconnect(conn.id)}
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20"
                  aria-label="Remove client"
                >
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
              </div>
            ))}
            {connections.length === 0 && (
              <p className="text-sm text-gray-600 dark:text-dark-400 text-center">
                No clients connected.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
