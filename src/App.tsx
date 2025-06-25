import React from 'react';
import { MCPProvider } from './context/MCPContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import { DoublePane } from './components/DoublePane';
import { Terminal } from './components/Terminal';
import { MultiClientManager } from './components/MultiClientManager';
import { OpposingTerminals } from './components/OpposingTerminals';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const [showTerminal, setShowTerminal] = React.useState(false);
  const [showClients, setShowClients] = React.useState(false);
  const [showOpposing, setShowOpposing] = React.useState(false);

  return (
    <BrowserRouter>
      <MCPProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-dark-900 transition-colors duration-300">
          <Header />
          <div className="flex h-[calc(100vh-80px)]">
            <Sidebar />
            <Routes>
              <Route path="/settings" element={<Settings />} />
              <Route path="/chat" element={<DoublePane />} />
              <Route path="/" element={<Navigate to="/settings" replace />} />
            </Routes>
          </div>

          {showTerminal && <Terminal onClose={() => setShowTerminal(false)} />}
          {showClients && <MultiClientManager onClose={() => setShowClients(false)} />}
          {showOpposing && <OpposingTerminals onClose={() => setShowOpposing(false)} />}
        </div>
      </MCPProvider>
    </BrowserRouter>
  );
}

export default App;