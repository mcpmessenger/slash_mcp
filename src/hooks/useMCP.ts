import { useState, useCallback } from 'react';
import { MCPConnection, MCPMessage, MCPResource, MCPTool, MCPPrompt } from '../types/mcp';

export const useMCP = () => {
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async (serverUrl: string) => {
    setIsConnecting(true);
    try {
      // Simulate MCP connection
      const mockConnection: MCPConnection = {
        id: `conn-${Date.now()}`,
        server: {
          name: 'Mock MCP Server',
          version: '1.0.0',
          capabilities: {
            resources: true,
            tools: true,
            prompts: true,
            sampling: true,
          }
        },
        status: 'connected',
        lastActivity: new Date(),
      };

      setConnections(prev => [...prev, mockConnection]);

      // Mock resources
      setResources([
        {
          uri: 'file:///example.txt',
          name: 'Example Document',
          description: 'A sample text document',
          mimeType: 'text/plain',
        },
        {
          uri: 'screenshot://desktop',
          name: 'Desktop Screenshot',
          description: 'Current desktop screenshot',
          mimeType: 'image/png',
        }
      ]);

      // Mock tools
      setTools([
        {
          name: 'file_search',
          description: 'Search for files in the filesystem',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              path: { type: 'string' }
            }
          }
        },
        {
          name: 'web_scrape',
          description: 'Extract content from web pages',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string' }
            }
          }
        }
      ]);

      // Mock prompts
      setPrompts([
        {
          name: 'analyze_code',
          description: 'Analyze code for potential issues',
          arguments: [
            { name: 'language', description: 'Programming language', required: true },
            { name: 'code', description: 'Code to analyze', required: true }
          ]
        }
      ]);

    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  }, []);

  const sendMessage = useCallback(async (connectionId: string, message: MCPMessage) => {
    // Simulate message sending
    console.log('Sending MCP message:', message);
    return { jsonrpc: '2.0' as const, id: message.id, result: 'success' };
  }, []);

  return {
    connections,
    resources,
    tools,
    prompts,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
  };
};