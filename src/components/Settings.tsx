import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Server, Database, Wrench, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMCP } from '../context/MCPContext';
import { useTheme } from '../hooks/useTheme';

export const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { connections, openAiKey, setOpenAiKey, anthropicKey, setAnthropicKey, geminiKey, setGeminiKey } = useMCP();
  const [serverUrl, setServerUrl] = React.useState('ws://localhost:8080');
  const [key, setKey] = React.useState(openAiKey);
  const [claudeK, setClaudeK] = React.useState(anthropicKey);
  const [gemKey, setGemKey] = React.useState(geminiKey);
  const [saved, setSaved] = React.useState(false);

  const handleSaveKeys = () => {
    setOpenAiKey(key.trim());
    setAnthropicKey(claudeK.trim());
    setGeminiKey(gemKey.trim());
    setSaved(true);
    setTimeout(()=>setSaved(false),1500);
  };

  return (
    <motion.div 
      className="flex-1 p-6 overflow-y-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <SettingsIcon className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure your Slash / MCP experience</p>
        </div>

        <div className="space-y-6">
          {/* Server Configuration */}
          <section className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Server className="w-5 h-5" />
              Server Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Server URL
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700"
                  placeholder="ws://localhost:8080"
                />
              </div>
            </div>
          </section>

          {/* Theme Settings */}
          <section className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Theme Preferences</h2>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* API Keys */}
          <section className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">API Keys</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">OpenAI</label>
                <input
                  type="password"
                  value={key}
                  placeholder="sk-..."
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Anthropic</label>
                <input
                  type="password"
                  value={claudeK}
                  placeholder="sk-ant-..."
                  onChange={(e) => setClaudeK(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Gemini</label>
                <input
                  type="password"
                  value={gemKey}
                  placeholder="sk-gem-..."
                  onChange={(e) => setGemKey(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
                />
              </div>

              <button
                onClick={handleSaveKeys}
                className="w-full mt-2 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded"
              >
                Save Keys
              </button>
              {saved && <p className="text-green-500 text-sm text-center">Saved!</p>}
            </div>
          </section>

          {/* Connection Status */}
          <section className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Connection Status
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Active Connections</span>
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full">
                {connections.length}
              </span>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="p-4 text-left rounded-lg border border-gray-200 dark:border-dark-600 hover:border-primary-500 dark:hover:border-primary-500 transition-colors">
                <MessageSquare className="w-5 h-5 mb-2 text-primary-600 dark:text-primary-400" />
                <h3 className="font-medium">Launch Terminal</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open a new terminal instance</p>
              </button>
              <Link to="/chat" className="p-4 text-left rounded-lg border border-gray-200 dark:border-dark-600 hover:border-primary-500 dark:hover:border-primary-500 transition-colors block">
                <Server className="w-5 h-5 mb-2 text-primary-600 dark:text-primary-400" />
                <h3 className="font-medium">Manage Connections</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">View and manage server connections</p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}; 