import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as Close, StopCircle } from 'lucide-react';
import { useMCP } from '../context/MCPContext';

interface TerminalProps {
  onClose: () => void;
}

interface TerminalEntry {
  id: number;
  command: string;
  output: string;
  status: 'running' | 'success' | 'error';
  execId?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { connections, invokeTool, invokeChat, invokeClaude, forwardRequest, onNotification, invokeGemini } = useMCP();

  // history handling
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const [selectedConn, setSelectedConn] = useState<string | null>(null);

  type Mode = 'shell' | 'chat' | 'claude' | 'gemini';
  const [mode, setMode] = useState<Mode>('shell');

  const currentTargetId = selectedConn ?? connections[0]?.id;

  const suggestions = ['@2 ls', 'chat "Hello world"', 'claude "Hi"', 'gemini "Idea"', 'ping', 'dir', 'ls'];

  useEffect(() => {
    if (!selectedConn && connections.length > 0) {
      setSelectedConn(connections[0].id);
    }
  }, [connections, selectedConn]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [entries]);

  useEffect(() => {
    const unsub = onNotification((msg) => {
      if (msg.method === 'mcp_streamOutput') {
        const { execId, chunk } = msg.params || {};
        setEntries((prev) => prev.map((e) => e.execId === execId ? { ...e, output: e.output + chunk } : e));
      }
      if (msg.method === 'mcp_execComplete') {
        const { execId, status } = msg.params || {};
        setEntries((prev) => prev.map((e) => e.execId === execId ? { ...e, status: status === 'error' ? 'error' : 'success' } : e));
      }
    });
    return () => unsub();
  }, [onNotification]);

  const executeCommand = async (command: string) => {
    const id = Date.now();
    const entry: TerminalEntry = { id, command, output: '', status: 'running' };
    setEntries(prev => [...prev, entry]);

    // If a real MCP connection is active, decide which tool to invoke
    const targetId = currentTargetId;

    // Detect custom verbs
    const parts = command.trim().split(' ');
    const verb = parts[0];

    // @routing
    if (verb.startsWith('@')) {
      const targetHandle = verb.slice(1);
      const targetConn = connections.find((c, idx) => `@${idx+1}`===verb || c.server.name === targetHandle || c.server.name.startsWith(targetHandle));
      if (!targetConn) {
        setEntries(prev=>prev.map(e=>e.id===id?{...e, output:'Target not found', status:'error'}:e));
      } else {
        const restParts = parts.slice(1);
        const secondVerb = restParts[0];
        let innerMsg: any;
        if (secondVerb === 'chat') {
          const prompt = restParts.slice(1).join(' ').replace(/^"|"$/g,'');
          innerMsg = { jsonrpc:'2.0', id: Date.now(), method:'mcp_invokeTool', params:{ toolName:'openai_chat', parameters:{ prompt } } };
        } else if (secondVerb === 'claude') {
          const prompt = restParts.slice(1).join(' ').replace(/^"|"$/g,'');
          innerMsg = { jsonrpc:'2.0', id: Date.now(), method:'mcp_invokeTool', params:{ toolName:'anthropic_chat', parameters:{ prompt } } };
        } else {
          const commandStr = restParts.join(' ');
          innerMsg = { jsonrpc:'2.0', id: Date.now(), method:'mcp_invokeTool', params:{ toolName:'shell_execute', parameters:{ command: commandStr } } };
        }

        forwardRequest(currentTargetId!, targetConn.id, innerMsg);
        setEntries(prev=>prev.map(e=>e.id===id?{...e, output:`Forwarded to ${targetConn.server.name}`, status:'success'}:e));
      }
      return;
    }

    if (targetId) {
      try {
        let res;
        if (verb === 'claude') {
          const prompt = command.slice(6).trim().replace(/^"|"$/g, '');
          res = await invokeClaude(targetId, prompt);
        } else if (verb === 'gemini') {
          const prompt = command.slice(6).trim().replace(/^"|"$/g, '');
          res = await invokeGemini(targetId, prompt);
        } else if (mode === 'chat') {
          res = await invokeChat(targetId, command);
        } else if (mode === 'claude') {
          res = await invokeClaude(targetId, command);
        } else if (mode === 'gemini') {
          res = await invokeGemini(targetId, command);
        } else {
          res = await invokeTool(targetId, 'shell_execute', { command });
        }

        if ('result' in res && res.result?.execId) {
          entry.execId = res.result.execId;
          setEntries(prev => prev.map(e => e.id === id ? { ...e, execId: res.result.execId } : e));
        } else if ('error' in res) {
          const msg = (res as any).error?.message ?? 'Error';
          setEntries(prev => prev.map(e => e.id === id ? { ...e, output: msg, status: 'error' } : e));
        }
      } catch (err: any) {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, output: err.message ?? 'Execution failed', status: 'error' } : e));
      }
    } else {
      // Fallback to local mock if no connection
      setTimeout(() => {
        const { output, status } = getCommandOutput(command);
        setEntries(prev => prev.map(e => e.id === id ? { ...e, output, status } : e));
      }, 200);
    }

    setHistory(prev => [...prev, command]);
    setHistoryIdx(-1);
  };

  const getCommandOutput = (cmd: string): { output: string; status: 'success' | 'error' } => {
    const parts = cmd.trim().split(/\s+/);
    const base = parts[0];
    const args = parts.slice(1);

    switch (base) {
      case 'ls':
        return { output: 'Desktop  Documents  Downloads  project', status: 'success' };
      case 'pwd':
        return { output: '/home/user', status: 'success' };
      case 'echo':
        return { output: args.join(' '), status: 'success' };
      case 'date':
        return { output: new Date().toString(), status: 'success' };
      case 'whoami':
        return { output: 'guest', status: 'success' };
      case 'help':
        return { output: 'Supported commands: ls, pwd, echo, date, whoami, help, clear', status: 'success' };
      case 'clear':
        setEntries([]);
        return { output: '', status: 'success' };
      default:
        return { output: `${base}: command not found`, status: 'error' };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = currentCommand.trim();
    if (!cmd) return;
    executeCommand(cmd);
    setCurrentCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistoryIdx((idx) => {
        const newIdx = idx < 0 ? history.length - 1 : Math.max(0, idx - 1);
        setCurrentCommand(history[newIdx] ?? '');
        return newIdx;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistoryIdx((idx) => {
        const newIdx = idx >= history.length - 1 ? history.length - 1 : idx + 1;
        setCurrentCommand(history[newIdx] ?? '');
        return newIdx;
      });
    }
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
          className="relative w-full max-w-3xl h-[70vh] bg-gray-900 text-gray-100 rounded-lg shadow-lg flex flex-col"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-700 space-x-4">
            <span className="text-sm font-mono text-green-400">guest@slash-mcp:~$</span>

            <div className="flex items-center space-x-2">
              {connections.length > 1 && (
                <select
                  value={selectedConn ?? ''}
                  onChange={(e) => setSelectedConn(e.target.value)}
                  className="bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none"
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>{c.server.name}</option>
                  ))}
                </select>
              )}

              <select
                value={mode}
                onChange={(e)=>setMode(e.target.value as Mode)}
                className="bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none"
              >
                <option value="shell">shell</option>
                <option value="chat">GPT</option>
                <option value="claude">Claude</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-700 transition-colors"
              aria-label="Close terminal"
            >
              <Close className="w-4 h-4" />
            </button>
          </div>

          <div ref={containerRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2 bg-gray-950/60">
            {entries.map(entry => (
              <div key={entry.id}>
                <div className="flex items-start">
                  <span className="text-green-400">$</span>
                  <span className="ml-2 whitespace-pre-wrap break-words">{entry.command}</span>
                </div>
                {entry.status === 'running' ? (
                  <div className="ml-4 flex items-center space-x-2">
                    <span className="text-primary-400 animate-pulse">running…</span>
                    {entry.execId && (
                      <button onClick={() => currentTargetId && invokeTool(currentTargetId, 'abort_exec', { execId: entry.execId })} className="text-red-400 hover:text-red-500" title="Abort">
                        <StopCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <pre className={`ml-4 whitespace-pre-wrap break-words ${entry.status === 'error' ? 'text-red-400' : 'text-gray-300'}`}>{entry.output}</pre>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-gray-900 border-t border-gray-700 flex items-center space-x-2">
            <span className="text-green-400 font-mono">$</span>
            <input
              type="text"
              autoFocus
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500 font-mono text-sm"
              placeholder="Type a command..."
              list="cmd-suggestions"
            />
            <datalist id="cmd-suggestions">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 