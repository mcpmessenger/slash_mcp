import React from 'react';
import { MCPProvider } from './context/MCPContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { Terminal } from './components/Terminal';
import { MultiClientManager } from './components/MultiClientManager';

function App() {
  const [showTerminal, setShowTerminal] = React.useState(false);
  const [showClients, setShowClients] = React.useState(false);

  return (
    <MCPProvider>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-dark-900 transition-colors duration-300">
      <Header
        onToggleTerminal={() => setShowTerminal(true)}
        onToggleClients={() => setShowClients(true)}
      />
      <div className="flex h-[calc(100vh-80px)]">
        <Sidebar />
        <MainContent />
      </div>

      {showTerminal && <Terminal onClose={() => setShowTerminal(false)} />}
      {showClients && <MultiClientManager onClose={() => setShowClients(false)} />}
    </div>
    </MCPProvider>
  );
}

export default App;