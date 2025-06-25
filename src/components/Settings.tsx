import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Server, Database, Wrench, MessageSquare, Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMCP } from '../context/MCPContext';

export const Settings: React.FC = () => {
  const { connections, resources, tools, prompts, openAiKey, setOpenAiKey, anthropicKey, setAnthropicKey, geminiKey, setGeminiKey, setStorageCreds, listResources } = useMCP();
  const [serverUrl, setServerUrl] = React.useState('ws://localhost:8080');
  const [key, setKey] = React.useState(openAiKey);
  const [claudeK, setClaudeK] = React.useState(anthropicKey);
  const [gemKey, setGemKey] = React.useState(geminiKey);
  const [saved, setSaved] = React.useState(false);
  const [supabaseUrl, setSupabaseUrl] = React.useState('');
  const [supabaseKey, setSupabaseKey] = React.useState('');
  const [sbSaved, setSbSaved] = React.useState(false);

  const handleSaveKeys = () => {
    setOpenAiKey(key.trim());
    setAnthropicKey(claudeK.trim());
    setGeminiKey(gemKey.trim());
    setSaved(true);
    setTimeout(()=>setSaved(false),1500);
  };

  const handleSaveSupabase = async () => {
    if (!connections[0]) return;
    try {
      await setStorageCreds(connections[0].id, supabaseUrl.trim(), supabaseKey.trim());
      await listResources(connections[0].id);
      setSbSaved(true);
      setTimeout(()=>setSbSaved(false),1500);
    } catch (err) {
      alert('Failed to set creds: '+ (err as any).message);
    }
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
          {/* Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-dark-800 rounded-lg p-4 shadow flex flex-col items-center">
              <Server className="w-6 h-6 text-primary-600 dark:text-primary-400 mb-2" />
              <span className="text-2xl font-bold">{connections.length}</span>
              <span className="text-xs text-gray-500">Connections</span>
            </div>
            <div className="bg-white dark:bg-dark-800 rounded-lg p-4 shadow flex flex-col items-center">
              <Database className="w-6 h-6 text-primary-600 dark:text-primary-400 mb-2" />
              <span className="text-2xl font-bold">{resources.length}</span>
              <span className="text-xs text-gray-500">Resources</span>
            </div>
            <div className="bg-white dark:bg-dark-800 rounded-lg p-4 shadow flex flex-col items-center">
              <Wrench className="w-6 h-6 text-primary-600 dark:text-primary-400 mb-2" />
              <span className="text-2xl font-bold">{tools.length}</span>
              <span className="text-xs text-gray-500">Tools</span>
            </div>
            <div className="bg-white dark:bg-dark-800 rounded-lg p-4 shadow flex flex-col items-center">
              <MessageSquare className="w-6 h-6 text-primary-600 dark:text-primary-400 mb-2" />
              <span className="text-2xl font-bold">{prompts.length}</span>
              <span className="text-xs text-gray-500">Prompts</span>
            </div>
          </div>

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

          {/* Storage Settings */}
          <section className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Supabase Storage
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Supabase URL</label>
                <input type="text" value={supabaseUrl} onChange={(e)=>setSupabaseUrl(e.target.value)} placeholder="https://project.supabase.co" className="w-full bg-gray-100 dark:bg-dark-700 px-3 py-2 rounded" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Service Role Key</label>
                <input type="password" value={supabaseKey} onChange={(e)=>setSupabaseKey(e.target.value)} placeholder="service-role..." className="w-full bg-gray-100 dark:bg-dark-700 px-3 py-2 rounded" />
              </div>
              <button onClick={handleSaveSupabase} className="w-full mt-2 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded">Save Supabase</button>
              {sbSaved && <p className="text-green-500 text-sm text-center">Supabase configured!</p>}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}; 