import React from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Server,
  Database,
  Wrench,
  MessageSquare,
  Cloud,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMCP } from '../context/MCPContext';
import { useToast } from '../context/ToastContext';

export const Settings: React.FC = () => {
  const {
    connections,
    resources,
    tools,
    prompts,
    openAiKey,
    setOpenAiKey,
    anthropicKey,
    setAnthropicKey,
    geminiKey,
    setGeminiKey,
    setStorageCreds,
    listResources,
    zapierWebhook,
    setZapierWebhook,
    supUrl,
    supKey,
    setSupabaseCredsLocal,
    zapierMcpUrl,
    setZapierMcpUrl,
    claudeMcpUrl,
    setClaudeMcpUrl,
    githubPat,
    setGithubPat,
  } = useMCP();
  const { addToast } = useToast();
  const [serverUrl, setServerUrl] = React.useState('ws://localhost:8080');
  const [key, setKey] = React.useState(openAiKey);
  const [claudeK, setClaudeK] = React.useState(anthropicKey);
  const [gemKey, setGemKey] = React.useState(geminiKey);
  const [saved, setSaved] = React.useState(false);
  const [zapUrl, setZapUrl] = React.useState(zapierWebhook);
  const [supabaseUrl, setSupabaseUrl] = React.useState(supUrl);
  const [supabaseKeyVal, setSupabaseKeyVal] = React.useState(supKey);
  const [sbSaved, setSbSaved] = React.useState(false);
  const [mcpUrl, setMcpUrl] = React.useState(zapierMcpUrl);
  const [claudeUrl, setClaudeUrl] = React.useState(claudeMcpUrl);
  const [gitPat, setGitPat] = React.useState(githubPat);
  const [claudeStatus, setClaudeStatus] = React.useState<'unknown' | 'online' | 'offline'>(
    'unknown',
  );

  const handleSaveKeys = () => {
    setOpenAiKey(key.trim());
    setAnthropicKey(claudeK.trim());
    setGeminiKey(gemKey.trim());
    setZapierWebhook(zapUrl.trim());
    setZapierMcpUrl(mcpUrl.trim());
    setClaudeMcpUrl(claudeUrl.trim());
    setGithubPat(gitPat.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleSaveSupabase = async () => {
    if (!connections[0]) {
      addToast('Connect to an MCP server first', 'error');
      return;
    }
    setSupabaseCredsLocal(supabaseUrl.trim(), supabaseKeyVal.trim());
    try {
      await setStorageCreds(connections[0].id, supabaseUrl.trim(), supabaseKeyVal.trim());
      await listResources(connections[0].id);
      addToast('Supabase creds saved', 'success');
    } catch (err: any) {
      addToast('Backend rejected creds: ' + err.message, 'error');
      return;
    }
    setSbSaved(true);
    setTimeout(() => setSbSaved(false), 1500);
  };

  // Check Claude MCP availability whenever URL changes
  React.useEffect(() => {
    if (!claudeUrl) {
      setClaudeStatus('unknown');
      return;
    }
    let cancelled = false;
    try {
      const wsUrl = claudeUrl.replace(/^http/, 'ws').replace(/^https/, 'wss');
      const ws = new WebSocket(wsUrl);
      const timer = setTimeout(() => {
        if (cancelled) return;
        ws.close();
        setClaudeStatus('offline');
      }, 4000);
      ws.onopen = () => {
        clearTimeout(timer);
        if (cancelled) {
          ws.close();
          return;
        }
        setClaudeStatus('online');
        ws.close();
      };
      ws.onerror = () => {
        clearTimeout(timer);
        if (cancelled) return;
        setClaudeStatus('offline');
      };
    } catch {
      setClaudeStatus('offline');
    }
    return () => {
      cancelled = true;
    };
  }, [claudeUrl]);

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
              <button
                onClick={async () => {
                  try {
                    const httpUrl = serverUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
                    const res = await fetch(httpUrl.replace(/\/$/, '') + '/healthz');
                    if (res.ok) {
                      addToast('Backend is healthy', 'success');
                    } else {
                      addToast('Health check failed', 'error');
                    }
                  } catch (err) {
                    addToast('Health check error: ' + (err as any).message, 'error');
                  }
                }}
                className="mt-2 px-3 py-1 bg-primary-600 text-white rounded"
              >
                Test connection
              </button>
            </div>
          </section>

          {/* API Keys */}
          <section className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">API Keys</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  OpenAI
                </label>
                <input
                  type="password"
                  value={key}
                  placeholder="sk-..."
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Anthropic
                </label>
                <input
                  type="password"
                  value={claudeK}
                  placeholder="sk-ant-..."
                  onChange={(e) => setClaudeK(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Gemini
                </label>
                <input
                  type="password"
                  value={gemKey}
                  placeholder="sk-gem-..."
                  onChange={(e) => setGemKey(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Zapier Webhook URL
                </label>
                <input
                  type="text"
                  value={zapUrl}
                  onChange={(e) => setZapUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                  className="w-full bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Zapier MCP Server URL
                </label>
                <input
                  type="text"
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder="https://XXXX.runs.mcp.zapier.com/..."
                  className="w-full bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  Claude MCP Server URL
                  {claudeStatus !== 'unknown' && (
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${claudeStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}
                    ></span>
                  )}
                </label>
                <input
                  type="text"
                  value={claudeUrl}
                  onChange={(e) => setClaudeUrl(e.target.value)}
                  placeholder="http://localhost:8081"
                  className="w-full bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 px-3 py-2 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={gitPat}
                  placeholder="ghp_..."
                  onChange={(e) => setGitPat(e.target.value)}
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
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Supabase URL
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://project.supabase.co"
                  className="w-full bg-gray-100 dark:bg-dark-700 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Service Role Key
                </label>
                <input
                  type="password"
                  value={supabaseKeyVal}
                  onChange={(e) => setSupabaseKeyVal(e.target.value)}
                  placeholder="service-role..."
                  className="w-full bg-gray-100 dark:bg-dark-700 px-3 py-2 rounded"
                />
              </div>
              <button
                onClick={handleSaveSupabase}
                className="w-full mt-2 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded"
              >
                Save Supabase
              </button>
              {sbSaved && (
                <p className="text-green-500 text-sm text-center">Supabase configured!</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};
