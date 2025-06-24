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
    // Forward to mock server
    const { handleRequest } = await import('../mockServer');
    const response = handleRequest(message);
    return response;
  }, []);

  /** Convenience helper to send a text resource */
  const sendTextResource = useCallback(async (connectionId: string, content: string) => {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'mcp_sendResource',
      params: { type: 'text', content },
    };
    const response = await sendMessage(connectionId, message);
    if ('result' in response && response.result?.resourceId) {
      // Add to local resources list
      setResources(prev => [
        ...prev,
        {
          uri: `mcp://${response.result.resourceId}`,
          name: `Text Resource ${prev.length + 1}`,
          description: 'User provided text',
          mimeType: 'text/plain',
          data: content,
        },
      ]);
    }
    return response;
  }, [sendMessage]);

  /** Convenience helper to invoke a tool */
  const invokeTool = useCallback(async (connectionId: string, toolName: string, parameters: any) => {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'mcp_invokeTool',
      params: { toolName, parameters },
    };
    return sendMessage(connectionId, message);
  }, [sendMessage]);

  /** Send binary file resource */
  const sendFileResource = useCallback(async (connectionId: string, file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'mcp_sendResource',
      params: { type: 'binary', content: arrayBuffer, name: file.name, mimeType: file.type },
    };
    const response = await sendMessage(connectionId, message);
    if ('result' in response && response.result?.resourceId) {
      let data: string | ArrayBuffer = arrayBuffer;
      if (file.type.startsWith('image/')) {
        const blob = new Blob([arrayBuffer], { type: file.type });
        data = URL.createObjectURL(blob);
      }
      setResources(prev => [
        ...prev,
        {
          uri: `mcp://${response.result.resourceId}`,
          name: file.name,
          description: 'Uploaded file',
          mimeType: file.type,
          data,
        },
      ]);
    }
    return response;
  }, [sendMessage]);

  return {
    connections,
    resources,
    tools,
    prompts,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    sendTextResource,
    invokeTool,
    sendFileResource,
  };
};