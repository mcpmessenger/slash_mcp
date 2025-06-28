import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as Close, StopCircle } from 'lucide-react';
import { useMCP } from '../context/MCPContext';
import TextareaAutosize from 'react-textarea-autosize';

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
  // Persistent template for LLM ↔︎ LLM hand-off
  const DEFAULT_TEMPLATE = '';
  const [currentCommand, setCurrentCommand] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    connections,
    invokeTool,
    invokeChat,
    invokeClaude,
    forwardRequest,
    onNotification,
    invokeGemini,
    sendMessage,
  } = useMCP();

  // history handling
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const [selectedConn, setSelectedConn] = useState<string | null>(null);

  type Mode = 'shell' | 'chat' | 'claude' | 'gemini';
  const [mode, setMode] = useState<Mode>('shell');

  const currentTargetId = selectedConn ?? connections[0]?.id;

  const suggestions = [
    '@2 ls',
    'chat "Hello world"',
    'claude "Hi"',
    'gemini "Idea"',
    'ping',
    'dir',
    'ls',
  ];

  const [completionIdx, setCompletionIdx] = useState<number>(-1);

  const [autoScroll, setAutoScroll] = useState(true);

  const computeCompletions = (prefix: string): string[] => {
    const pool = [...suggestions, ...connections.map((c, idx) => `@${idx + 1}`)];
    return pool.filter((p) => p.startsWith(prefix) && p !== prefix);
  };

  useEffect(() => {
    if (!selectedConn && connections.length > 0) {
      setSelectedConn(connections[0].id);
    }
  }, [connections, selectedConn]);

  const scrollToBottom = () => {
    if (!autoScroll) return;
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [entries]);

  // Detect user scroll position to toggle autoScroll
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(nearBottom);
  };

  useEffect(() => {
    const unsub = onNotification((msg) => {
      if (msg.method === 'mcp_streamOutput') {
        const { execId, chunk } = msg.params || {};
        setEntries((prev) =>
          prev.map((e) => (e.execId === execId ? { ...e, output: e.output + chunk } : e)),
        );
      }
      if (msg.method === 'mcp_execComplete') {
        const { execId, status } = msg.params || {};
        setEntries((prev) =>
          prev.map((e) =>
            e.execId === execId ? { ...e, status: status === 'error' ? 'error' : 'success' } : e,
          ),
        );
      }
    });
    return () => unsub();
  }, [onNotification]);

  const executeCommand = async (command: string) => {
    const id = Date.now();
    const entry: TerminalEntry = { id, command, output: '', status: 'running' };
    setEntries((prev) => [...prev, entry]);

    // If a real MCP connection is active, decide which tool to invoke
    const targetId = currentTargetId;

    // Detect custom verbs
    const parts = command.trim().split(' ');
    const verb = parts[0];

    // @routing
    if (verb.startsWith('@')) {
      const targetHandle = verb.slice(1);
      const targetConn = connections.find(
        (c, idx) =>
          `@${idx + 1}` === verb ||
          c.server.name === targetHandle ||
          c.server.name.startsWith(targetHandle),
      );
      if (!targetConn) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, output: 'Target not found', status: 'error' } : e,
          ),
        );
      } else {
        const restParts = parts.slice(1);
        const secondVerb = restParts[0];
        let innerMsg: any;
        if (secondVerb === 'chat') {
          const prompt = restParts.slice(1).join(' ').replace(/^"|"$/g, '');
          innerMsg = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'mcp_invokeTool',
            params: { toolName: 'openai_chat', parameters: { prompt } },
          };
        } else if (secondVerb === 'claude') {
          const prompt = restParts.slice(1).join(' ').replace(/^"|"$/g, '');
          innerMsg = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'mcp_invokeTool',
            params: { toolName: 'anthropic_chat', parameters: { prompt } },
          };
        } else {
          const commandStr = restParts.join(' ');
          innerMsg = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'mcp_invokeTool',
            params: { toolName: 'shell_execute', parameters: { command: commandStr } },
          };
        }

        forwardRequest(currentTargetId!, targetConn.id, innerMsg);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, output: `Forwarded to ${targetConn.server.name}`, status: 'success' }
              : e,
          ),
        );
      }
      return;
    }

    // Raw RPC support
    if (verb === 'rpc') {
      const method = parts[1];
      const jsonTail = command.slice(command.indexOf(method) + method.length).trim();
      let paramsObj: any = {};
      if (jsonTail) {
        try {
          paramsObj = JSON.parse(jsonTail);
        } catch {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, output: 'Invalid JSON params', status: 'error' } : e,
            ),
          );
          return;
        }
      }
      if (!targetId) {
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, output: 'Not connected', status: 'error' } : e)),
        );
        return;
      }
      try {
        const resp = await sendMessage(targetId, {
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params: paramsObj,
        });
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, output: JSON.stringify(resp, null, 2), status: 'success' } : e,
          ),
        );
      } catch (err: any) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, output: err.message ?? 'RPC failed', status: 'error' } : e,
          ),
        );
      }
      return;
    }

    // New: tool shorthand eg: tool openai_tool {"prompt":"hi"}
    if (verb === 'tool') {
      const toolName = parts[1];
      const jsonStr = command.slice(command.indexOf(toolName) + toolName.length).trim();
      let params: any = {};
      if (jsonStr) {
        try {
          params = JSON.parse(jsonStr);
        } catch {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, output: 'Invalid JSON payload', status: 'error' } : e,
            ),
          );
          return;
        }
      }
      if (!targetId) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, output: 'Not connected to MCP server', status: 'error' } : e,
          ),
        );
        return;
      }
      try {
        const res = await invokeTool(targetId, toolName, params);
        if ('result' in res) {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id
                ? { ...e, output: JSON.stringify(res.result, null, 2), status: 'success' }
                : e,
            ),
          );
        } else {
          const errObj: any = (res as any).error || {};
          let msg = errObj.message ?? 'Error';
          if (errObj.data && errObj.data.allowed) {
            msg += `\nAllowed commands: ${errObj.data.allowed.join(', ')}`;
          }
          setEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, output: msg, status: 'error' } : e)),
          );
        }
      } catch (err: any) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, output: err.message ?? 'Execution failed', status: 'error' } : e,
          ),
        );
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
          setEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, execId: res.result.execId } : e)),
          );
        } else if ('error' in res) {
          const errObj: any = (res as any).error || {};
          let msg = errObj.message ?? 'Error';
          if (errObj.data && errObj.data.allowed) {
            msg += `\nAllowed commands: ${errObj.data.allowed.join(', ')}`;
          }
          setEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, output: msg, status: 'error' } : e)),
          );
        }
      } catch (err: any) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, output: err.message ?? 'Execution failed', status: 'error' } : e,
          ),
        );
      }
    } else {
      // Fallback to local mock if no connection
      setTimeout(() => {
        const { output, status } = getCommandOutput(command);
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, output, status } : e)));
      }, 200);
    }

    setHistory((prev) => [...prev, command]);
    setHistoryIdx(-1);
    // After execution, clear input
    setCurrentCommand('');
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
        return {
          output: 'Supported commands: ls, pwd, echo, date, whoami, help, clear',
          status: 'success',
        };
      case 'clear':
        setEntries([]);
        return { output: '', status: 'success' };
      default:
        return { output: `${base}: command not found`, status: 'error' };
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const parts = currentCommand.split(/\s+/);
      const last = parts[parts.length - 1];
      const options = computeCompletions(last);
      if (options.length === 0) return;
      const nextIdx = (completionIdx + 1) % options.length;
      parts[parts.length - 1] = options[nextIdx];
      setCurrentCommand(parts.join(' '));
      setCompletionIdx(nextIdx);
      return;
    }
    // reset completion cycle on other keys
    setCompletionIdx(-1);

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cmd = currentCommand.trim();
      if (cmd) executeCommand(cmd);
      return;
    }
    if (e.key === 'ArrowUp' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      setHistoryIdx((idx) => {
        const newIdx = idx < 0 ? history.length - 1 : Math.max(0, idx - 1);
        setCurrentCommand(history[newIdx] ?? '');
        return newIdx;
      });
    }
    if (e.key === 'ArrowDown' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      setHistoryIdx((idx) => {
        const newIdx = idx >= history.length - 1 ? history.length - 1 : idx + 1;
        setCurrentCommand(history[newIdx] ?? '');
        return newIdx;
      });
    }
  };

  // --- Drag-and-drop support from Sidebar ---
  const handleDragOverInput = (e: React.DragEvent<HTMLTextAreaElement>) => {
    // Allow dropping by preventing default
    e.preventDefault();
  };

  const handleDropOnInput = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const { type, item } = JSON.parse(raw);
      const applyValue = (placeholder: string, value: string, cmd: string) => {
        if (cmd.includes(placeholder)) {
          return cmd.replace(placeholder, value);
        }
        return cmd.trim() ? `${cmd} ${value}` : value;
      };

      let newCmd = currentCommand;

      switch (type) {
        case 'connection': {
          const handle = item?.handle ?? '';
          newCmd = applyValue('@{connection}', handle, newCmd);
          break;
        }
        case 'tool': {
          const val = item?.name ?? '';
          newCmd = applyValue('{tools}', val, newCmd);
          break;
        }
        case 'resource': {
          const val = item?.uri ?? item?.name ?? '';
          newCmd = applyValue('{resources}', val, newCmd);
          break;
        }
        case 'prompt': {
          const val = item?.name ?? '';
          newCmd = applyValue('{prompts}', val, newCmd);
          break;
        }
        default:
          break;
      }

      setCurrentCommand(newCmd);
    } catch {
      // Ignore malformed payloads
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
                    <option key={c.id} value={c.id}>
                      {c.server.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
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

          <form
            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const cmd = currentCommand.trim();
              if (!cmd) return;
              executeCommand(cmd);
            }}
            className="p-3 bg-gray-900 border-b border-gray-700 flex items-center space-x-2"
          >
            <span className="text-green-400 font-mono">$</span>
            <TextareaAutosize
              minRows={1}
              maxRows={6}
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              onDragOver={handleDragOverInput}
              onDrop={handleDropOnInput}
              className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500 font-mono text-sm resize-none"
              placeholder="Type a command... (Shift+Enter for newline)"
            />
          </form>

          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2 bg-gray-950/60"
            onMouseEnter={() => setAutoScroll(false)}
            onMouseLeave={() => setAutoScroll(true)}
          >
            {entries.map((entry) => (
              <div key={entry.id}>
                <div className="flex items-start">
                  <span className="text-green-400">$</span>
                  <span className="ml-2 whitespace-pre-wrap break-words">{entry.command}</span>
                </div>
                {entry.status === 'running' ? (
                  <div className="ml-4 flex items-center space-x-2">
                    <span className="text-primary-400 animate-pulse">running…</span>
                    {entry.execId && (
                      <button
                        onClick={() =>
                          currentTargetId &&
                          invokeTool(currentTargetId, 'abort_exec', { execId: entry.execId })
                        }
                        className="text-red-400 hover:text-red-500"
                        title="Abort"
                      >
                        <StopCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <pre
                    className={`ml-4 whitespace-pre-wrap break-words ${entry.status === 'error' ? 'text-red-400' : 'text-gray-300'}`}
                  >
                    {entry.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
