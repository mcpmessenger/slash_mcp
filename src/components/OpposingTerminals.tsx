import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as Close } from 'lucide-react';
import { useMCP } from '../context/MCPContext';
import { TerminalPane } from './TerminalPane';

interface OpposingTerminalsProps {
  onClose: () => void;
}

export const OpposingTerminals: React.FC<OpposingTerminalsProps> = ({ onClose }) => {
  const { connections } = useMCP();
  if (connections.length < 2) {
    return (
      <AnimatePresence>
        <motion.div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="bg-gray-900 text-gray-100 p-6 rounded shadow-lg" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
            <p>Connect at least two clients to use opposing terminals.</p>
            <button onClick={onClose} className="mt-4 px-3 py-1 bg-primary-600 rounded">Close</button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const [connA, connB] = connections;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full max-w-6xl h-[80vh] bg-gray-900 text-gray-100 rounded-lg shadow-lg flex flex-col" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <button onClick={onClose} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-700"><Close className="w-4 h-4" /></button>
          <div className="flex flex-1 divide-x divide-gray-700">
            <TerminalPane initialConnId={connA.id} />
            <TerminalPane initialConnId={connB.id} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 