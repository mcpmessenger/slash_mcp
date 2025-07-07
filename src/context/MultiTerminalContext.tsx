import React from 'react';

export interface PaneConfig {
  id: string;
  connId?: string;
}

export type MultiTerminalAction =
  | { type: 'add' }
  | { type: 'remove'; id: string }
  | { type: 'setConn'; id: string; connId: string };

function reducer(state: PaneConfig[], action: MultiTerminalAction): PaneConfig[] {
  switch (action.type) {
    case 'add':
      return [
        ...state,
        { id: crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) },
      ];
    case 'remove':
      return state.filter((p) => p.id !== action.id);
    case 'setConn':
      return state.map((p) => (p.id === action.id ? { ...p, connId: action.connId } : p));
    default:
      return state;
  }
}

interface Ctx {
  panes: PaneConfig[];
  dispatch: React.Dispatch<MultiTerminalAction>;
}

const MultiTerminalContext = React.createContext<Ctx | null>(null);

export const MultiTerminalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [panes, dispatch] = React.useReducer(reducer, [{ id: 'default' }]);
  return (
    <MultiTerminalContext.Provider value={{ panes, dispatch }}>
      {children}
    </MultiTerminalContext.Provider>
  );
};

export const useMultiTerminal = () => {
  const ctx = React.useContext(MultiTerminalContext);
  if (!ctx) throw new Error('useMultiTerminal must be used within MultiTerminalProvider');
  return ctx;
};
