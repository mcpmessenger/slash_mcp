import React from 'react';
import { useMCP } from '../context/MCPContext';
import { TerminalPane } from './TerminalPane';

export const DoublePane: React.FC = () => {
  const { connections } = useMCP();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = React.useState<number | null>(null);
  const [isResizing, setIsResizing] = React.useState(false);

  React.useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      setLeftWidth(Math.max(200, Math.min(newWidth, rect.width - 200)));
    };
    const stop = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stop);
    };
  }, [isResizing]);

  if (connections.length < 2) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-600 dark:text-gray-400 p-6 text-center">
        <div>
          <p className="text-lg font-medium mb-2">You need two connections to start.</p>
          <p className="mb-4">Click <span className="font-semibold">Add Connection</span> in the sidebar twice to create them.</p>
          <p className="text-4xl animate-bounce">⬅️</p>
        </div>
      </div>
    );
  }

  const [connA, connB] = connections;

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <div ref={containerRef} className="relative flex flex-1 h-full">
      <div style={{flexBasis: leftWidth ? `${leftWidth}px` : '50%'}} className="min-w-[200px]">
        <TerminalPane initialConnId={connA.id} />
      </div>
      <div onMouseDown={startResize} className="w-2 cursor-col-resize bg-gray-700 hover:bg-gray-500" />
      <div style={{flexBasis: leftWidth ? `calc(100% - ${leftWidth}px - 2px)` : '50%'}} className="min-w-[200px] flex-1">
        <TerminalPane initialConnId={connB.id} />
      </div>
    </div>
  );
}; 