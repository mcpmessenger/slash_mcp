import { useEffect } from 'react';
import { useMCP } from '../context/MCPContext';

const DEFAULT_URL = 'ws://localhost:8080';

const AutoConnect: React.FC = () => {
  const { connections, connect } = useMCP();

  useEffect(() => {
    // Ensure at least ONE connection on start, but don't persistently force duplicates.
    if (connections.length === 0) {
      connect(DEFAULT_URL).catch(() => {});
    }
  }, [connections, connect]);

  return null;
};

export default AutoConnect;
