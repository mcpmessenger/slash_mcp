import React from 'react';
import { useMCP } from '../context/MCPContext';
import { TerminalPane } from './TerminalPane';

export const DoublePane: React.FC = () => {
  const { connections } = useMCP();

  if (connections.length < 2) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-600 dark:text-gray-400">
        <p>Connect at least two MCP servers to start using live terminals.</p>
      </div>
    );
  }

  const [connA, connB] = connections;

  return (
    <div className="flex flex-1 divide-x divide-gray-700">
      <TerminalPane initialConnId={connA.id} />
      <TerminalPane initialConnId={connB.id} />
    </div>
  );
}; 