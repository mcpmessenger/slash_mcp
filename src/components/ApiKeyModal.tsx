import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as Close } from 'lucide-react';
import { useMCP } from '../context/MCPContext';

interface ApiKeyModalProps {
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose }) => {
  const { openAiKey, setOpenAiKey, anthropicKey, setAnthropicKey, geminiKey, setGeminiKey } = useMCP();
  const [key, setKey] = useState(openAiKey);
  const [claudeK, setClaudeK] = useState(anthropicKey);
  const [gemKey, setGemKey] = useState(geminiKey);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [saved]);

  const handleSave = () => {
    setOpenAiKey(key.trim());
    setAnthropicKey(claudeK.trim());
    setGeminiKey(gemKey.trim());
    setSaved(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 space-y-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <Close className="w-4 h-4" />
          </button>

          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">API Keys</h2>

          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">OpenAI</label>
          <input
            type="password"
            value={key}
            placeholder="sk-..."
            onChange={(e) => setKey(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
          />

          <label className="block mt-4 text-xs text-gray-500 dark:text-gray-400 mb-1">Anthropic</label>
          <input
            type="password"
            value={claudeK}
            placeholder="sk-ant-..."
            onChange={(e) => setClaudeK(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
          />

          <label className="block mt-4 text-xs text-gray-500 dark:text-gray-400 mb-1">Gemini</label>
          <input
            type="password"
            value={gemKey}
            placeholder="sk-gem-..."
            onChange={(e) => setGemKey(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
          />

          <button
            onClick={handleSave}
            className="w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded"
          >
            Save
          </button>

          {saved && <p className="text-green-500 text-sm text-center">Saved!</p>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 