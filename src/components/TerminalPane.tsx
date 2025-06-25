import React, { useState, useRef, useEffect } from 'react';
import { StopCircle } from 'lucide-react';
import { useMCP } from '../context/MCPContext';

interface Entry {
  id: number;
  command: string;
  output: string;
  status: 'running' | 'success' | 'error';
  execId?: string;
}

export const TerminalPane: React.FC<{ initialConnId: string }> = ({ initialConnId }) => {
  const { connections, invokeTool, invokeChat, invokeClaude, invokeGemini, onNotification, forwardRequest } = useMCP();
  const [connId, setConnId] = useState<string>(initialConnId);
  const [entries, setEntries] = useState<Entry[]>([]);
  // Persistent template with placeholders
  const DEFAULT_TEMPLATE = '@{connection} {resources},{tools},{prompts}';
  const [current, setCurrent] = useState<string>(DEFAULT_TEMPLATE);
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

  // base whitelist of local commands
  const whitelist = ['ls','pwd','echo','date','whoami','help','clear'];
  const suggestions = [
    ...connections.slice(0,2).map((c,idx)=>`@${idx+1} ls`),
    ...whitelist
  ];

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

        // Notify other panes to mirror the entry
        window.dispatchEvent(new CustomEvent('mcp_mirror', {detail:{targetConnId: targetConn.id, command: restParts.join(' ')}}));

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

    if (verb === 'tool') {
      const toolName = parts[1];
      const jsonStr = cmd.slice(cmd.indexOf(toolName) + toolName.length).trim();
      let params: any = {};
      if (jsonStr) {
        try {
          params = JSON.parse(jsonStr);
        } catch {
          setEntries(prev=>prev.map(e=>e.id===id?{...e, output:'Invalid JSON payload', status:'error'}:e));
          setHistory(prev=>[...prev,cmd]);
          setHistoryIdx(-1);
          return;
        }
      }
      try {
        const res = await invokeTool(connId, toolName, params);
        if ('result' in res) {
          setEntries(prev=>prev.map(e=>e.id===id?{...e, output: JSON.stringify(res.result, null, 2), status:'success'}:e));
        } else {
          const msg = (res as any).error?.message ?? 'Error';
          setEntries(prev=>prev.map(e=>e.id===id?{...e, output: msg, status:'error'}:e));
        }
      } catch(err:any) {
        setEntries(prev=>prev.map(e=>e.id===id?{...e, output: err.message ?? 'Error', status:'error'}:e));
      }
      setHistory(prev=>[...prev,cmd]);
      setHistoryIdx(-1);
      return;
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
      } else if ('result' in res && res.result?.toolOutput) {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, output: res.result.toolOutput, status: 'success' } : e));
      } else if ('error' in res) {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, output: res.error?.message ?? 'Error', status: 'error' } : e));
      }
    } catch (err: any) {
      // Local fallback for simple commands
      const fallback = getLocalCommandOutput(cmd);
      if (fallback) {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, output: fallback.output, status: fallback.status } : e));
      } else {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, output: err.message ?? 'Error', status: 'error' } : e));
      }
    }
    setHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);
  };

  // Listen for mirror events from other panes
  useEffect(() => {
    const handler = (e: any) => {
      const { targetConnId, command } = e.detail || {};
      if (targetConnId === connId) {
        const id = Date.now();
        setEntries(prev => [...prev, { id, command, output: '(executed remotely)', status: 'success' }]);
      }
    };
    window.addEventListener('mcp_mirror', handler);
    return () => window.removeEventListener('mcp_mirror', handler);
  }, [connId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = current.trim();
    if (!cmd) return;
    execute(cmd);
    setCurrent(DEFAULT_TEMPLATE);
  };

  const handleDragOverInput = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  const handleDropOnInput = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const { type, item } = JSON.parse(raw);
      const applyValue = (placeholder: string, value: string, cmd: string) => {
        if (cmd.includes(placeholder)) return cmd.replace(placeholder, value);
        return cmd.trim() ? `${cmd} ${value}` : value;
      };

      let newCmd = current;
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
      setCurrent(newCmd);
    } catch {}
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

  // Simple local whitelist (same as original Terminal component)
  const getLocalCommandOutput = (cmd: string): { output: string; status: 'success' | 'error' } | null => {
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
        return null;
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
      <form onSubmit={handleSubmit} className="p-2 bg-gray-900 border-b border-gray-700 flex items-center space-x-2">
        <span className="text-green-400 font-mono">$</span>
        <input
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOverInput}
          onDrop={handleDropOnInput}
          placeholder="Type..."
          className="flex-1 bg-transparent outline-none text-gray-100 text-sm"
          list="suggestions"
        />
        <datalist id="suggestions">
          {suggestions.map(s => <option key={s} value={s} />)}
        </datalist>
      </form>
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-2 bg-gray-900 dark:bg-gray-950/80 text-gray-200">
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
    </div>
  );
}; 