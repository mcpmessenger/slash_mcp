import React, { useState, useEffect } from 'react';
import { ChatWindow } from './ChatWindow';
import { Rnd } from 'react-rnd';
import { useMCP } from '../../context/MCPContext';

type Message = { role: 'user' | 'assistant'; content: string; execId?: string };
type ChatWindowType = {
  id: string;
  title: string;
  messages: Message[];
  x: number;
  y: number;
  width: number;
  height: number;
  model: string;
};

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 350;

const MODELS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Gemini' },
];

export function MultiChatManager() {
  const { invokeChat, invokeClaude, invokeGemini, connections, onNotification } = useMCP();
  const activeConnId = connections[0]?.id;
  const [chatWindows, setChatWindows] = useState<ChatWindowType[]>([
    {
      id: '1',
      title: 'Chat 1',
      messages: [],
      x: 60,
      y: 60,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      model: 'openai',
    },
    {
      id: '2',
      title: 'Chat 2',
      messages: [],
      x: 500,
      y: 60,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      model: 'openai',
    },
    {
      id: '3',
      title: 'Chat 3',
      messages: [],
      x: 300,
      y: 350,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      model: 'openai',
    },
  ]);

  function addChat() {
    const id = Date.now().toString();
    setChatWindows([
      ...chatWindows,
      {
        id,
        title: `Chat ${chatWindows.length + 1}`,
        messages: [],
        x: 100 + chatWindows.length * 40,
        y: 100 + chatWindows.length * 40,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        model: 'openai',
      },
    ]);
  }

  async function sendMessageToBackend(id: string, msg: string, model: string) {
    if (!activeConnId) {
      alert('No MCP connection available!');
      return;
    }
    setChatWindows((windows) =>
      windows.map((w) =>
        w.id === id
          ? {
              ...w,
              messages: [
                ...w.messages,
                { role: 'user', content: msg },
                { role: 'assistant', content: '...' },
              ],
            }
          : w,
      ),
    );
    let execId: string | undefined;
    let response = '';
    let debugRaw = '';
    try {
      if (model === 'openai') {
        const res = await invokeChat(activeConnId, msg);
        execId = res?.result?.execId;
        debugRaw = JSON.stringify(res, null, 2);
        response = debugRaw;
      } else if (model === 'anthropic') {
        const res = await invokeClaude(activeConnId, msg, { model: 'claude-3-sonnet-20240229' });
        execId = res?.result?.execId;
        debugRaw = JSON.stringify(res, null, 2);
        response = debugRaw;
      } else if (model === 'gemini') {
        const res = await invokeGemini(activeConnId, msg);
        execId = res?.result?.execId;
        debugRaw = JSON.stringify(res, null, 2);
        response = debugRaw;
      }
    } catch (err) {
      response = `Error: ${err instanceof Error ? err.message : err}`;
      debugRaw = response;
    }
    setChatWindows((windows) =>
      windows.map((w) => {
        if (w.id !== id) return w;
        const msgs = [...w.messages];
        const lastIdx = msgs.length - 1;
        if (msgs[lastIdx]?.role === 'assistant') {
          msgs[lastIdx] = { ...msgs[lastIdx], execId };
        }
        return { ...w, messages: msgs };
      }),
    );
  }

  function removeChat(id: string) {
    setChatWindows((windows) => windows.filter((w) => w.id !== id));
  }

  function updateWindowPosition(id: string, x: number, y: number) {
    setChatWindows((windows) => windows.map((w) => (w.id === id ? { ...w, x, y } : w)));
  }

  function updateWindowSizeAndPosition(
    id: string,
    width: number,
    height: number,
    x: number,
    y: number,
  ) {
    setChatWindows((windows) =>
      windows.map((w) => (w.id === id ? { ...w, width, height, x, y } : w)),
    );
  }

  function setChatModel(id: string, model: string) {
    setChatWindows((windows) => windows.map((w) => (w.id === id ? { ...w, model } : w)));
  }

  useEffect(() => {
    // Listen for streaming output
    const unsub = onNotification((msg) => {
      if (msg.method === 'mcp_streamOutput') {
        const { execId, chunk } = msg.params || {};
        setChatWindows((windows) =>
          windows.map((w) => {
            const msgs = [...w.messages];
            const lastIdx = msgs.length - 1;
            // Find the assistant message with matching execId
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i]?.role === 'assistant' && msgs[i]?.execId === execId) {
                msgs[i] = {
                  ...msgs[i],
                  content: (msgs[i].content === '...' ? '' : msgs[i].content) + chunk,
                };
                break;
              }
            }
            return { ...w, messages: msgs };
          }),
        );
      }
    });
    return () => unsub();
  }, [onNotification]);

  return (
    <div className="relative w-full h-[calc(100vh-80px)] bg-transparent">
      {chatWindows.map((w, idx) => (
        <Rnd
          key={w.id}
          size={{ width: w.width, height: w.height }}
          position={{ x: w.x, y: w.y }}
          onDragStop={(e, d) => updateWindowPosition(w.id, d.x, d.y)}
          onResizeStop={(e, direction, ref, delta, position) =>
            updateWindowSizeAndPosition(
              w.id,
              ref.offsetWidth,
              ref.offsetHeight,
              position.x,
              position.y,
            )
          }
          minWidth={320}
          minHeight={240}
          bounds="parent"
          style={{ zIndex: 100 + idx }}
          dragHandleClassName="chat-drag-handle"
        >
          <div className="flex flex-col h-full bg-[#232323] dark:bg-[#232323] rounded-[28px] shadow-lg border border-gray-700 overflow-hidden">
            <div className="chat-drag-handle flex items-center justify-between px-4 py-2 bg-[#18181b] text-white rounded-t-[28px] select-none">
              <div className="flex items-center gap-2">
                <select
                  value={w.model}
                  onChange={(e) => setChatModel(w.id, e.target.value)}
                  className="rounded-md bg-[#232323] text-white border border-gray-700 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  style={{ minWidth: 110 }}
                >
                  {MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <span className="ml-2 font-semibold text-lg">{w.title}</span>
              </div>
              <button
                onClick={() => removeChat(w.id)}
                className="ml-2 text-red-400 hover:text-red-600 font-bold text-lg bg-transparent border-none cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow
                window={w}
                onSendMessage={(msg) => sendMessageToBackend(w.id, msg, w.model)}
              />
            </div>
          </div>
        </Rnd>
      ))}
      <button
        onClick={addChat}
        className="fixed bottom-8 right-8 z-[999] bg-green-500 text-white rounded-full w-14 h-14 text-3xl shadow-lg flex items-center justify-center hover:bg-green-600"
      >
        +
      </button>
      {chatWindows.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xl">
          No chats open. Click + to start a new chat.
        </div>
      )}
    </div>
  );
}
