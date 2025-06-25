import { useEffect } from 'react';
import { useMCP } from '../context/MCPContext';

const DEFAULT_URL = 'ws://localhost:8080';

const AutoConnect: React.FC = () => {
  const { connections, connect } = useMCP();

  useEffect(() => {
    // Ensure at least two connections
    const need = 2 - connections.length;
    if (need > 0) {
      for (let i = 0; i < need; i++) {
        connect(DEFAULT_URL).catch(() => {});
      }
    }
  }, [connections, connect]);

  return null;
};

export default AutoConnect; 