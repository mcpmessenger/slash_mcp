import React, { useState, useRef } from 'react';
import { PromptBox } from './chatgpt-prompt-input';

const MCP_TOOLS = [
  { command: '/summarize', label: 'Summarize' },
  { command: '/search', label: 'Search' },
  { command: '/code', label: 'Code' },
  { command: '/image', label: 'Image' },
];

type Message = { role: 'user' | 'assistant'; content: string };

type ChatWindowProps = {
  window: {
    id: string;
    title: string;
    messages: Message[];
  };
  onSendMessage: (msg: string) => void;
  onMemoryNote?: (note: string) => void;
};

export function ChatWindow({ window, onSendMessage, onMemoryNote }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [showToolDropdown, setShowToolDropdown] = useState(false);
  const [toolFilter, setToolFilter] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (inputValue.trim()) {
      if (inputValue.startsWith('#')) {
        onMemoryNote?.(inputValue);
      } else {
        onSendMessage(inputValue);
      }
      setInputValue('');
      setShowToolDropdown(false);
      setToolFilter('');
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInputValue(val);
    // Show MCP tool dropdown if '/' is typed as the first character or after a space
    const cursorPos = e.target.selectionStart;
    if (val[cursorPos - 1] === '/') {
      setShowToolDropdown(true);
      setToolFilter('');
    } else if (showToolDropdown) {
      // If dropdown is open, filter tools by current word after '/'
      const match = val.slice(0, cursorPos).match(/\/(\w*)$/);
      setToolFilter(match ? match[1] : '');
      if (!match) setShowToolDropdown(false);
    }
  }

  function handleToolSelect(tool: { command: string; label: string }) {
    // Insert the tool command at the cursor position
    if (inputRef.current) {
      const textarea = inputRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = inputValue.slice(0, start - 1); // remove the just-typed '/'
      const after = inputValue.slice(end);
      const newValue = before + tool.command + ' ' + after;
      setInputValue(newValue);
      setShowToolDropdown(false);
      setToolFilter('');
      // Move cursor after inserted command
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = before.length + tool.command.length + 1;
      }, 0);
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  }

  // Add a handler to trigger send from PromptBox
  function handlePromptBoxSend() {
    handleSend({ preventDefault: () => {} } as any);
  }

  const filteredTools = MCP_TOOLS.filter(
    (t) =>
      t.command.includes(toolFilter) || t.label.toLowerCase().includes(toolFilter.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full max-h-full relative">
      <div className="flex-1 overflow-y-auto mb-4 pr-2">
        {window.messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <span
              className={`inline-block px-3 py-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'}`}
            >
              {msg.content}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="mt-auto relative">
        <PromptBox
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onSend={handlePromptBoxSend}
          placeholder="Type your message..."
          className="w-full"
        />
        {showToolDropdown && (
          <div className="absolute left-0 bottom-14 w-64 bg-[#232323] border border-gray-700 rounded-lg shadow-lg z-50">
            {filteredTools.length > 0 ? (
              filteredTools.map((tool) => (
                <button
                  key={tool.command}
                  type="button"
                  className="block w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white text-white"
                  onClick={() => handleToolSelect(tool)}
                >
                  <span className="font-mono text-blue-300">{tool.command}</span>{' '}
                  <span className="ml-2">{tool.label}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-400">No tools found</div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
