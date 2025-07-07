import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { MCPProvider } from './context/MCPContext';
import { ToastProvider } from './context/ToastContext';
import { MultiTerminalProvider } from './context/MultiTerminalContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <MCPProvider>
        <MultiTerminalProvider>
          <App />
        </MultiTerminalProvider>
      </MCPProvider>
    </ToastProvider>
  </StrictMode>,
);
