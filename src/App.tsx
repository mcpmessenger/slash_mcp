import React from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-dark-900 transition-colors duration-300">
      <Header />
      <div className="flex h-[calc(100vh-80px)]">
        <Sidebar />
        <MainContent />
      </div>
    </div>
  );
}

export default App;