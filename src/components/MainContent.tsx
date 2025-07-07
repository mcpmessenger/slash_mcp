import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Upload, Image, FileText, Code, Zap } from 'lucide-react';
import { useMCP } from '../context/MCPContext';

export const MainContent: React.FC = () => {
  const { connect, isConnecting, connections, sendTextResource, invokeTool, sendFileResource } =
    useMCP();
  const [message, setMessage] = useState('');
  const [serverUrl, setServerUrl] = useState('ws://localhost:8080');
  interface ChatEntry {
    id: number;
    role: 'user' | 'server';
    content: string;
    img?: string;
  }
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [hoveredImg, setHoveredImg] = useState<string | null>(null);
  const hiddenFileInput = React.useRef<HTMLInputElement>(null);

  const handleConnect = () => {
    if (serverUrl.trim()) {
      connect(serverUrl);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || connections.length === 0) return;

    const userEntry = { id: Date.now(), role: 'user' as const, content: message };
    setChat((prev) => [...prev, userEntry]);

    // Send to MCP mock server
    const response = await sendTextResource(connections[0].id, message);

    if ('result' in response && (response.result?.output || response.result?.toolOutput)) {
      let reply = response.result.output;
      if (!reply && response.result.toolOutput) {
        const match = response.result.toolOutput.match(/"prompt":"([^"]+)"/);
        reply = match ? match[1] : '(No model reply found)';
      }
      const serverEntry = {
        id: Date.now() + 1,
        role: 'server' as const,
        content: reply,
      };
      setChat((prev) => [...prev, serverEntry]);
    } else if (response.error) {
      const serverEntry = {
        id: Date.now() + 1,
        role: 'server' as const,
        content: `Error: ${response.error.message}`,
      };
      setChat((prev) => [...prev, serverEntry]);
    }

    setMessage('');
  };

  const handleQuickTextResource = async () => {
    if (connections.length === 0) return alert('Connect to an MCP server first.');
    const text = window.prompt('Enter text to send as resource:');
    if (!text) return;
    setMessage(text);
    await handleSendMessageVia(text);
  };

  const handleQuickCodeAnalysis = async () => {
    if (connections.length === 0) return alert('Connect to an MCP server first.');
    const language = window.prompt('Language (e.g., javascript, python):');
    if (!language) return;
    const code = window.prompt('Paste code for analysis:');
    if (!code) return;
    // show user code in chat
    const userEntry = {
      id: Date.now(),
      role: 'user' as const,
      content: `Analyze ${language} code:\n${code}`,
    };
    setChat((prev) => [...prev, userEntry]);
    const response = await invokeTool(connections[0].id, 'analyze_code', { language, code });
    if ('result' in response && response.result?.toolOutput) {
      const serverEntry = {
        id: Date.now() + 1,
        role: 'server' as const,
        content: response.result.toolOutput,
      };
      setChat((prev) => [...prev, serverEntry]);
    } else if (response.error) {
      const serverEntry = {
        id: Date.now() + 1,
        role: 'server' as const,
        content: `Error: ${response.error.message}`,
      };
      setChat((prev) => [...prev, serverEntry]);
    }
  };

  const handleSendMessageVia = async (text: string) => {
    // extracted inner of handleSendMessage to reuse for quick text resource
    const userEntry = { id: Date.now(), role: 'user' as const, content: text };
    setChat((prev) => [...prev, userEntry]);
    const response = await sendTextResource(connections[0].id, text);
    if ('result' in response && (response.result?.output || response.result?.toolOutput)) {
      let reply = response.result.output;
      if (!reply && response.result.toolOutput) {
        const match = response.result.toolOutput.match(/"prompt":"([^"]+)"/);
        reply = match ? match[1] : '(No model reply found)';
      }
      const serverEntry = {
        id: Date.now() + 1,
        role: 'server' as const,
        content: reply,
      };
      setChat((prev) => [...prev, serverEntry]);
    } else if (response.error) {
      const serverEntry = {
        id: Date.now() + 1,
        role: 'server' as const,
        content: `Error: ${response.error.message}`,
      };
      setChat((prev) => [...prev, serverEntry]);
    }
  };

  const handleUploadClick = () => {
    if (connections.length === 0) return alert('Connect to an MCP server first.');
    hiddenFileInput.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file || connections.length === 0) return;
    const localUrl = URL.createObjectURL(file);
    const userEntry: ChatEntry = {
      id: Date.now(),
      role: 'user',
      content: `Uploaded file: ${file.name}`,
      img: localUrl,
    };
    setChat((prev) => [...prev, userEntry]);
    const response = await sendFileResource(connections[0].id, file);
    if ('result' in response && response.result?.info) {
      const serverEntry = {
        id: Date.now() + 1,
        role: 'server' as const,
        content: response.result.info,
      };
      setChat((prev) => [...prev, serverEntry]);
    } else if (response.error) {
      const serverEntry = {
        id: Date.now() + 1,
        role: 'server' as const,
        content: `Error: ${response.error.message}`,
      };
      setChat((prev) => [...prev, serverEntry]);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Connection Status */}
      <motion.div
        className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-dark-900 dark:to-dark-800 border-b border-gray-200 dark:border-dark-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="MCP Server URL"
                className="px-3 py-2 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <motion.button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-glow hover:shadow-glow-dark transition-all duration-300 disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </motion.button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-dark-400">
              {connections.length} active connection{connections.length !== 1 ? 's' : ''}
            </span>
            <div
              className={`w-3 h-3 rounded-full ${connections.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}
            />
          </div>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <motion.div
          className="max-w-4xl mx-auto space-y-6"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {/* Welcome Message */}
          <div className="text-center py-12">
            <motion.div
              className="inline-block p-6 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-dark-800 dark:to-dark-700 rounded-2xl shadow-glow dark:shadow-glow-dark"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Zap className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-200 mb-2">
                Welcome to Slash / MCP
              </h2>
              <p className="text-gray-600 dark:text-dark-400 max-w-md">
                Connect to MCP servers to access resources, tools, and prompts for enhanced AI
                interactions.
              </p>
            </motion.div>
          </div>

          {/* Chat Messages */}
          {chat.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-2 rounded-lg ${entry.role === 'user' ? 'bg-primary-50 dark:bg-dark-800' : 'bg-accent-50 dark:bg-dark-800'}`}
                onMouseEnter={() => {
                  if (entry.img) setHoveredImg(entry.img);
                }}
                onMouseLeave={() => setHoveredImg(null)}
              >
                {entry.content}
              </div>
            </div>
          ))}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: Upload,
                label: 'Upload Resource',
                color: 'primary',
                onClick: handleUploadClick,
              },
              {
                icon: Image,
                label: 'Screenshot',
                color: 'accent',
                onClick: () => alert('Not implemented yet'),
              },
              {
                icon: FileText,
                label: 'Text Resource',
                color: 'primary',
                onClick: handleQuickTextResource,
              },
              {
                icon: Code,
                label: 'Code Analysis',
                color: 'accent',
                onClick: handleQuickCodeAnalysis,
              },
            ].map((action, idx) => (
              <motion.button
                key={idx}
                className={`p-4 rounded-xl bg-${action.color}-50 dark:bg-dark-800 border border-${action.color}-200 dark:border-dark-700 hover:shadow-glow dark:hover:shadow-glow-dark transition-all duration-300`}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + idx * 0.1 }}
                onClick={action.onClick}
              >
                <action.icon
                  className={`w-6 h-6 text-${action.color}-600 dark:text-${action.color}-400 mx-auto mb-2`}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-dark-300">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Message Input */}
      <motion.div
        className="p-4 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border-t border-gray-200 dark:border-dark-800"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Send a message to the MCP server..."
                className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-inner-glow"
              />
            </div>

            <motion.button
              onClick={handleSendMessage}
              disabled={!message.trim() || connections.length === 0}
              className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-glow hover:shadow-glow-dark transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        className="p-4 text-center text-sm text-gray-500 dark:text-dark-500 border-t border-gray-200 dark:border-dark-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p>
          Developed by{' '}
          <a
            href="https://automationalien.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            automationalien.com
          </a>
        </p>
      </motion.footer>

      {/* add hidden file input element inside root */}
      <input type="file" ref={hiddenFileInput} onChange={handleFileChange} className="hidden" />

      {hoveredImg && (
        <div className="fixed bottom-24 right-8 z-50 border border-gray-200 dark:border-dark-700 bg-white dark:bg-black p-2 rounded shadow-lg">
          <img
            src={hoveredImg}
            alt="preview"
            className="max-w-[200px] max-h-[200px] object-contain"
          />
        </div>
      )}
    </div>
  );
};
