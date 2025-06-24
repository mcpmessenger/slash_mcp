import { useState, useCallback } from 'react';
import { MCPConnection, MCPMessage, MCPResource, MCPTool, MCPPrompt } from '../types/mcp';
import { MCPWebSocketClient } from '../lib/MCPWebSocketClient';

export const useMCP = () => {
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async (serverUrl: string) => {
    setIsConnecting(true);
    try {
      const client = new MCPWebSocketClient(serverUrl);
      await client.waitUntilOpen();

      const connection: MCPConnection & { client: MCPWebSocketClient } = {
        id: client.id,
        server: {
          name: serverUrl.replace(/^wss?:\/\//, ''),
          version: 'unknown',
          capabilities: {
            resources: true,
            tools: true,
            prompts: true,
            sampling: true,
          },
        },
        status: 'connected',
        lastActivity: new Date(),
        client,
      } as any;

      setConnections(prev => [...prev, connection]);

      // Fetch capabilities
      try {
        const capResponse = await client.send({ jsonrpc: '2.0', id: Date.now(), method: 'mcp_getCapabilities' });
        if ('result' in capResponse) {
          const { resources: res = [], tools: tls = [], prompts: prs = [] } = capResponse.result || {};
          setResources(res);
          setTools(tls);
          setPrompts(prs);
        }
      } catch (capErr) {
        console.warn('Failed to fetch capabilities', capErr);
      }
    } catch (err) {
      console.error('Connection failed, falling back to mock mode', err);
      // fallback to mock connection only if environment is development
      if (import.meta.env.DEV) {
        const mockConnection: MCPConnection = {
          id: `mock-${Date.now()}`,
          server: {
            name: 'Mock MCP Server',
            version: '1.0.0',
            capabilities: { resources: true, tools: true, prompts: true, sampling: true },
          },
          status: 'connected',
          lastActivity: new Date(),
        };
        setConnections(prev => [...prev, mockConnection]);
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback((connectionId: string) => {
    setConnections(prev => {
      const conn = (prev as Array<MCPConnection & { client?: MCPWebSocketClient }>).find(c => c.id === connectionId);
      conn?.client?.close();
      return prev.filter(c => c.id !== connectionId);
    });
  }, []);

  const sendMessage = useCallback(async (connectionId: string, message: MCPMessage) => {
    const conn = (connections as Array<MCPConnection & { client?: MCPWebSocketClient }>).find(c => c.id === connectionId);
    if (conn?.client) {
      return conn.client.send(message);
    }
    // If no client (mock)
    const { handleRequest } = await import('../mockServer');
    return handleRequest(message);
  }, [connections]);

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
    // Convert to Base64 for transport
    const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'mcp_sendResource',
      params: { type: 'binary', content: base64String, name: file.name, mimeType: file.type },
    };
    const response = await sendMessage(connectionId, message);
    if ('result' in response && response.result?.resourceId) {
      let data: string | ArrayBuffer | undefined;
      if (response.result.url) {
        // absolute URL relative to backend
        data = response.result.url;
      } else if (file.type.startsWith('image/')) {
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
    onNotification: (handler: (msg: MCPMessage) => void) => {
      const unsubs: Array<() => void> = [];
      (connections as any).forEach((c: any) => {
        if (c.client) {
          unsubs.push(c.client.onNotification(handler));
        }
      });
      return () => unsubs.forEach((f) => f());
    }
  };
};