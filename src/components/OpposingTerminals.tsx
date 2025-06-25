import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as Close, StopCircle } from 'lucide-react';
import { useMCP } from '../context/MCPContext';

interface OpposingTerminalsProps {
  onClose: () => void;
}

interface Entry {
  id: number;
  command: string;
  output: string;
  status: 'running' | 'success' | 'error';
  execId?: string;
}

const TerminalPane: React.FC<{ initialConnId: string }> = ({ initialConnId }) => {
  const { connections, invokeTool, invokeChat, invokeClaude, invokeGemini, onNotification, forwardRequest } = useMCP();
  const [connId, setConnId] = useState<string>(initialConnId);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [current, setCurrent] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [mode, setMode] = useState<'shell' | 'chat' | 'claude' | 'gemini'>('shell');

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    });
  };
  useEffect(scrollToBottom, [entries]);

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

  const suggestions = ['@1 ls', '@2 chat "Hi"', 'chat "Hello"'];

  const execute = async (cmd: string) => {
    const id = Date.now();
    const entry: Entry = { id, command: cmd, output: '', status: 'running' };
    setEntries(prev => [...prev, entry]);

    const parts = cmd.trim().split(' ');
    const verb = parts[0];

    // @ forwarding
    if (verb.startsWith('@')) {
      const targetHandle = verb.slice(1);
      const targetConn = connections.find((c, idx) => `@${idx+1}`===verb || c.server.name === targetHandle || c.server.name.startsWith(targetHandle));
      if (!targetConn) {
        setEntries(prev=>prev.map(e=>e.id===id?{...e, output:'Target not found', status:'error'}:e));
      } else {
        const restParts = parts.slice(1);
        const secondVerb = restParts[0];
        let innerMsg:any;
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

        forwardRequest(connId, targetConn.id, innerMsg);
        setEntries(prev=>prev.map(e=>e.id===id?{...e, output:`Forwarded to ${targetConn.server.name}`, status:'success'}:e));
      }
      setHistory(prev=>[...prev,cmd]);
      setHistoryIdx(-1);
      return;
    }

    // mode based execution when no explicit verb and not @
    if(!verb.startsWith('@')){
      if(mode==='chat'){
        const res=await invokeChat(connId, cmd);
        if('result' in res && res.result?.execId){ entry.execId=res.result.execId; setEntries(prev=>prev.map(e=>e.id===id?{...e, execId: res.result.execId}:e));}
        return;
      }
      if(mode==='claude'){
        const res=await invokeClaude(connId, cmd);
        if('result' in res && res.result?.execId){ entry.execId=res.result.execId; setEntries(prev=>prev.map(e=>e.id===id?{...e, execId: res.result.execId}:e));}
      }
      if(mode==='gemini'){
        const res=await invokeGemini(connId, cmd);
        if('result' in res && res.result?.execId){ entry.execId=res.result.execId; setEntries(prev=>prev.map(e=>e.id===id?{...e, execId: res.result.execId}:e));}
      }
    }

    try {
      let res;
      if (verb === 'chat') {
        const prompt = cmd.slice(4).trim().replace(/^"|"$/g, '');
        res = await invokeChat(connId, prompt);
      } else {
        res = await invokeTool(connId, 'shell_execute', { command: cmd });
      }
      if ('result' in res && res.result?.execId) {
        entry.execId = res.result.execId;
        setEntries(prev => prev.map(e => e.id === id ? { ...e, execId: res.result.execId } : e));
      } else if ('error' in res) {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, output: res.error?.message ?? 'Error', status: 'error' } : e));
      }
    } catch (err: any) {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, output: err.message ?? 'Error', status: 'error' } : e));
    }
    setHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = current.trim();
    if (!cmd) return;
    execute(cmd);
    setCurrent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistoryIdx(idx => {
        const newIdx = idx < 0 ? history.length - 1 : Math.max(0, idx - 1);
        setCurrent(history[newIdx] ?? '');
        return newIdx;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistoryIdx(idx => {
        const newIdx = idx >= history.length - 1 ? history.length - 1 : idx + 1;
        setCurrent(history[newIdx] ?? '');
        return newIdx;
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full border-r border-gray-700">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 text-gray-100 text-xs">
        <div className="flex items-center space-x-2">
          <select value={connId} onChange={(e)=>setConnId(e.target.value)} className="bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-1 py-0.5 focus:outline-none">
            {connections.map(c=>(<option key={c.id} value={c.id}>{c.server.name}</option>))}
          </select>
          <select value={mode} onChange={(e)=>setMode(e.target.value as 'shell' | 'chat' | 'claude' | 'gemini')} className="bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-1 py-0.5 focus:outline-none">
            <option value="shell">shell</option>
            <option value="chat">chat</option>
            <option value="claude">claude</option>
            <option value="gemini">gemini</option>
          </select>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-2 bg-gray-950/60">
        {entries.map(en => (
          <div key={en.id}>
            <div className="flex items-start">
              <span className="text-green-400">$</span>
              <span className="ml-2 whitespace-pre-wrap break-words">{en.command}</span>
            </div>
            {en.status === 'running' ? (
              <div className="ml-4 flex items-center space-x-2">
                <span className="text-primary-400 animate-pulse">running…</span>
                {en.execId && (
                  <button onClick={()=>invokeTool(connId,'abort_exec',{execId:en.execId})} title="Abort" className="text-red-400 hover:text-red-500"><StopCircle className="w-4 h-4"/></button>
                )}
              </div>
            ) : (
              <pre className={`ml-4 whitespace-pre-wrap break-words ${en.status === 'error' ? 'text-red-400' : 'text-gray-300'}`}>{en.output}</pre>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-2 bg-gray-900 flex items-center space-x-2">
        <span className="text-green-400 font-mono">$</span>
        <input
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type..."
          className="flex-1 bg-transparent outline-none text-gray-100 text-sm"
          list="suggestions"
        />
        <datalist id="suggestions">
          {suggestions.map(s => <option key={s} value={s} />)}
        </datalist>
      </form>
    </div>
  );
};

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