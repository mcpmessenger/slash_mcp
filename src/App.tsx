import React from 'react';
import { MCPProvider } from './context/MCPContext';
import { ToastProvider } from './context/ToastContext';
import { MultiTerminalProvider } from './context/MultiTerminalContext';
import { Header } from './components/Header';
import AutoConnect from './components/AutoConnect';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import { TerminalGrid } from './components/TerminalGrid';
import { MultiClientManager } from './components/MultiClientManager';
import { OpposingTerminals } from './components/OpposingTerminals';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Playground } from './components/Playground';
import { Walkthrough } from './components/Walkthrough';
import { Terminal } from './components/Terminal';

function App() {
  const [showTerminal, setShowTerminal] = React.useState(false);
  const [showClients, setShowClients] = React.useState(false);
  const [showOpposing, setShowOpposing] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true);

  return (
    <BrowserRouter>
      <ToastProvider>
        <MCPProvider>
          <MultiTerminalProvider>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-dark-900 transition-colors duration-300">
              <Header />
              <div className="flex h-[calc(100vh-80px)]">
                <Sidebar
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((p) => !p)}
                />
                <Routes>
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/chat" element={<TerminalGrid />} />
                  <Route path="/playground" element={<Playground />} />
                  <Route path="/" element={<Navigate to="/chat" replace />} />
                </Routes>
              </div>

              {showTerminal && <Terminal onClose={() => setShowTerminal(false)} />}
              {showClients && <MultiClientManager onClose={() => setShowClients(false)} />}
              {showOpposing && <OpposingTerminals onClose={() => setShowOpposing(false)} />}
              <AutoConnect />
              <Walkthrough />
            </div>
          </MultiTerminalProvider>
        </MCPProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
