import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Database, PenTool as Tool, MessageSquare, ChevronRight, Plus, Circle } from 'lucide-react';
import { useMCP } from '../context/MCPContext';

export const Sidebar: React.FC<{ collapsed?: boolean; onToggle?: () => void }> = ({ collapsed=false, onToggle }) => {
  const { connections, resources, tools, prompts, connect, listResources, sendFileResource } = useMCP();
  const [activeSection, setActiveSection] = useState<string>('connections');
  const [hoveredImg, setHoveredImg] = useState<string | null>(null);

  useEffect(() => {
    if (activeSection === 'resources' && resources.length === 0 && connections[0]) {
      listResources(connections[0].id).catch(() => {});
    }
  }, [activeSection, resources.length, connections, listResources]);

  const sections = [
    { id: 'connections', label: 'Connections', icon: Server, count: connections.length },
    { id: 'resources', label: 'Resources', icon: Database, count: resources.length },
    { id: 'tools', label: 'Tools', icon: Tool, count: tools.length },
    { id: 'prompts', label: 'Prompts', icon: MessageSquare, count: prompts.length },
  ];

  return (
    <motion.aside 
      className={`relative bg-white/50 dark:bg-black/50 backdrop-blur-md border-r border-gray-200 dark:border-dark-700 overflow-y-auto transition-all duration-300 ${collapsed ? 'w-6 p-0' : 'w-80 p-4'}`}
      initial={false}
      animate={{}}
    >
      {/* collapse/expand arrow */}
      {!collapsed && (
        <button onClick={onToggle} className="absolute -right-3 top-1/2 -translate-y-1/2 bg-gray-700 text-white rounded-full w-6 h-6 flex items-center justify-center shadow">
          <span className="sr-only">Collapse</span>
          ❮
        </button>
      )}
      {collapsed && (
        <button onClick={onToggle} className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-700 text-white rounded-r w-6 h-12 flex items-center justify-center shadow">
          <span className="sr-only">Expand</span>
          ❯
        </button>
      )}
      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.id}>
            <motion.button
              onClick={() => setActiveSection(activeSection === section.id ? '' : section.id)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-100/50 dark:bg-dark-800/50 hover:shadow-glow dark:hover:shadow-glow-dark transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <section.icon className="w-5 h-5 text-primary-600 dark:text-white" />
                <span className="font-medium text-gray-800 dark:text-white">
                  {section.label}
                </span>
                <span className="px-2 py-1 text-xs bg-primary-100 dark:bg-dark-700 text-primary-700 dark:text-white rounded-full">
                  {section.count}
                </span>
              </div>
              <motion.div
                animate={{ rotate: activeSection === section.id ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-dark-400" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {activeSection === section.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 ml-4 space-y-2">
                    {section.id === 'connections' && connections.map((conn, idx) => (
                      <div
                        key={conn.id}
                        draggable
                        onDragStart={(e) => {
                          const handle = `@${idx + 1}`;
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({ type: 'connection', item: { handle, id: conn.id, name: conn.server.name } })
                          );
                        }}
                        className="flex items-center space-x-2 p-2 rounded bg-gray-50 dark:bg-dark-800"
                      >
                        <Circle className={`w-3 h-3 ${conn.status === 'connected' ? 'text-green-500' : 'text-red-500'}`} />
                        <span className="text-sm text-gray-700 dark:text-white">{conn.server.name}</span>
                      </div>
                    ))}
                    
                    {section.id === 'resources' && (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            const file = e.dataTransfer.files[0];
                            if (connections[0]) {
                              try {
                                await sendFileResource(connections[0].id, file);
                              } catch (err) {
                                console.error('Upload failed', err);
                              }
                            } else {
                              alert('Connect to an MCP server first');
                            }
                          }
                        }}
                        className="space-y-2"
                      >
                        {resources.map((resource, idx) => (
                          <div
                            key={idx}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                'application/json',
                                JSON.stringify({ type: 'resource', item: resource })
                              );
                            }}
                            className="p-2 rounded bg-gray-50 dark:bg-dark-800 relative cursor-pointer hover:ring-1 hover:ring-primary-400"
                            onClick={() => {
                              const url = (resource.data as string) || (resource.path as any) || (resource.url as any) || '';
                              if (url) window.open(url, '_blank');
                            }}
                            onMouseEnter={() => {
                              if (typeof resource.data === 'string' && resource.mimeType?.startsWith('image/')) {
                                setHoveredImg(resource.data);
                              }
                            }}
                            onMouseLeave={() => setHoveredImg(null)}
                          >
                            <div className="text-sm font-medium text-gray-800 dark:text-white">{resource.name}</div>
                            <div className="text-xs text-gray-500 dark:text-dark-400 truncate max-w-[180px]">{resource.uri}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {section.id === 'tools' && tools.map((tool, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({ type: 'tool', item: tool })
                          );
                        }}
                        className="p-2 rounded bg-gray-50 dark:bg-dark-800"
                      >
                        <div className="text-sm font-medium text-gray-800 dark:text-white">{tool.name}</div>
                        <div className="text-xs text-gray-500 dark:text-dark-400">{tool.description}</div>
                      </div>
                    ))}
                    
                    {section.id === 'prompts' && prompts.map((prompt, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({ type: 'prompt', item: prompt })
                          );
                        }}
                        className="p-2 rounded bg-gray-50 dark:bg-dark-800"
                      >
                        <div className="text-sm font-medium text-gray-800 dark:text-white">{prompt.name}</div>
                        <div className="text-xs text-gray-500 dark:text-dark-400">{prompt.description}</div>
                      </div>
                    ))}

                    {(section.id === 'connections' || section.id === 'resources') && (
                      <motion.button
                        onClick={async () => {
                          if (section.id === 'connections') {
                            const url = window.prompt('Enter MCP server URL', 'ws://localhost:8080');
                            if (url && url.trim()) connect(url.trim());
                          } else if (section.id === 'resources') {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.onchange = async () => {
                              if (input.files && input.files[0] && connections[0]) {
                                await sendFileResource(connections[0].id, input.files[0]);
                              }
                            };
                            input.click();
                          }
                        }}
                        className="w-full flex items-center justify-center space-x-2 p-2 rounded border-2 border-dashed border-gray-300 dark:border-dark-600 hover:border-primary-400 dark:hover:border-white transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="w-4 h-4 dark:text-white" />
                        <span className="text-sm dark:text-white">Add {section.label.slice(0, -1)}</span>
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      {hoveredImg && (
        <div className="absolute top-2 right-2 z-50 border border-gray-200 dark:border-dark-700 shadow-lg bg-white dark:bg-black p-2 rounded">
          <img src={hoveredImg} alt="preview" className="max-w-[150px] max-h-[150px] object-contain" />
        </div>
      )}
    </motion.aside>
  );
};