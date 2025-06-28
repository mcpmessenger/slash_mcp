import React, { createContext, useContext } from 'react';
import { useMCP as useMCPState } from '../hooks/useMCP';

// Value type is whatever useMCPState returns
export type MCPContextValue = ReturnType<typeof useMCPState>;

const MCPContext = createContext<MCPContextValue | null>(null);

export const MCPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mcp = useMCPState();
  return <MCPContext.Provider value={mcp}>{children}</MCPContext.Provider>;
};

export const useMCP = (): MCPContextValue => {
  const ctx = useContext(MCPContext);
  if (!ctx) {
    throw new Error('useMCP must be used within MCPProvider');
  }
  return ctx;
};
