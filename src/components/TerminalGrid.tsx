import React from 'react';
import { useMultiTerminal } from '../context/MultiTerminalContext';
import { useMCP } from '../context/MCPContext';
import { TerminalPane } from './TerminalPane';
import { Plus, X } from 'lucide-react';

export const TerminalGrid: React.FC = () => {
  const { panes, dispatch } = useMultiTerminal();
  const { connections } = useMCP();

  return (
    <div className="flex-1 p-2 overflow-auto">
      <button
        onClick={() => dispatch({ type: 'add' })}
        className="mb-2 px-3 py-1 bg-primary-600 text-white rounded flex items-center gap-1"
      >
        <Plus size={16} /> Add Pane
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 auto-rows-fr">
        {panes.map((pane) => (
          <div key={pane.id} className="relative bg-gray-900/20 rounded-lg overflow-hidden">
            <button
              onClick={() => dispatch({ type: 'remove', id: pane.id })}
              className="absolute top-1 right-1 text-gray-400 hover:text-red-500 z-10"
            >
              <X size={14} />
            </button>
            <TerminalPane initialConnId={pane.connId ?? connections[0]?.id ?? ''} />
          </div>
        ))}
      </div>
    </div>
  );
}; 