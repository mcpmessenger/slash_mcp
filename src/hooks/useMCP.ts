import { useState, useCallback, useEffect } from 'react';
import { MCPConnection, MCPMessage, MCPResource, MCPTool, MCPPrompt } from '../types/mcp';
import { MCPWebSocketClient } from '../lib/MCPWebSocketClient';

// Track how many connections we've made per base host so we can assign unique display names even across rapid connects.
const connectionCounters: Record<string, number> = {};

export const useMCP = () => {
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [prompts, setPrompts] = useState<MCPPrompt[]>(() => {
    try {
      const saved = localStorage.getItem('mcp_prompts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [openAiKey, setOpenAiKeyState] = useState<string>(() => localStorage.getItem('openai_key') ?? '');
  const [anthropicKey, setAnthropicKeyState] = useState<string>(() => localStorage.getItem('anthropic_key') ?? '');
  const [geminiKey, setGeminiKeyState] = useState<string>(() => localStorage.getItem('gemini_key') ?? '');
  const [zapierWebhook, setZapierWebhookState] = useState<string>(() => localStorage.getItem('zapier_webhook') ?? '');
  const [zapierMcpUrl, setZapierMcpUrlState] = useState<string>(() => {
    const stored = localStorage.getItem('zapier_mcp_url');
    if (stored) return stored;
    // Migrate older key if user previously saved under zapier_webhook
    const legacy = localStorage.getItem('zapier_mcp');
    return legacy ?? '';
  });
  const [claudeMcpUrl, setClaudeMcpUrlState] = useState<string>(() => localStorage.getItem('claude_mcp_url') ?? '');
  const [supUrl, setSupUrlState] = useState<string>(() => localStorage.getItem('supabase_url') ?? '');
  const [supKey, setSupKeyState] = useState<string>(() => localStorage.getItem('supabase_key') ?? '');
  const [githubPat, setGithubPatState] = useState<string>(() => localStorage.getItem('github_pat') ?? '');
  const [isConnecting, setIsConnecting] = useState(false);

  // Persist prompts whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('mcp_prompts', JSON.stringify(prompts));
      localStorage.setItem('zapier_webhook', zapierWebhook);
      localStorage.setItem('zapier_mcp_url', zapierMcpUrl);
      localStorage.setItem('claude_mcp_url', claudeMcpUrl);
      localStorage.setItem('supabase_url', supUrl);
      localStorage.setItem('supabase_key', supKey);
      localStorage.setItem('github_pat', githubPat);
    } catch {}
  }, [prompts, zapierWebhook, zapierMcpUrl, claudeMcpUrl, supUrl, supKey, githubPat]);

  const connect = useCallback(async (serverUrl: string) => {
    setIsConnecting(true);
    try {
      const client = new MCPWebSocketClient(serverUrl);
      await client.waitUntilOpen();

      const baseName = serverUrl.replace(/^wss?:\/\//, '').replace(/\/$/, '');
      connectionCounters[baseName] = (connectionCounters[baseName] || 0) + 1;
      const count = connectionCounters[baseName];
      const displayName = count === 1 ? baseName : `${baseName} #${count}`;

      const connection: MCPConnection & { client: MCPWebSocketClient } = {
        id: client.id,
        server: {
          name: displayName,
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

      // Automatically remove from state when socket closes
      client.onClose(() => {
        setConnections(prev => prev.filter(c => c.id !== connection.id));
      });

      setConnections(prev => [...prev, connection]);

      // Register connection and logical agent ID with backend for forwarding
      try {
        await client.send({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'mcp_register',
          params: { connectionId: client.id, agentId: displayName },
        });
      } catch {}

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
  }, [connections]);

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
      const { url } = response.result || {};
      // Add to local resources list
      setResources(prev => [
        ...prev,
        {
          uri: `mcp://${response.result.resourceId}`,
          name: `Text Resource ${prev.length + 1}`,
          description: 'User provided text',
          mimeType: 'text/plain',
          data: url ?? content,
        },
      ]);
    }
    return response;
  }, [sendMessage]);

  /** Convenience helper to invoke a tool */
  const invokeTool = useCallback(async (connectionId: string, toolName: string, parameters: any) => {
    // Auto-inject GitHub PAT if invoking GitHub tool
    if (toolName === 'github_mcp_tool' && !parameters.github_token && githubPat) {
      parameters = { ...parameters, github_token: githubPat };
    }
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'mcp_invokeTool',
      params: { toolName, parameters },
    };
    return sendMessage(connectionId, message);
  }, [sendMessage, githubPat]);

  /** Convenience helper for OpenAI chat */
  const invokeChat = useCallback(async (connectionId: string, prompt: string) => {
    if (!openAiKey) {
      throw new Error('OpenAI API key not set');
    }
    return invokeTool(connectionId, 'openai_chat', { prompt, apiKey: openAiKey });
  }, [invokeTool, openAiKey]);

  const invokeClaude = useCallback(async (connectionId: string, prompt: string) => {
    if (!anthropicKey) throw new Error('Anthropic API key not set');
    return invokeTool(connectionId, 'anthropic_chat', { prompt, apiKey: anthropicKey });
  }, [invokeTool, anthropicKey]);

  const invokeGemini = useCallback(async (connectionId: string, prompt: string) => {
    if (!geminiKey) throw new Error('Gemini API key not set');
    return invokeTool(connectionId, 'gemini_chat', { prompt, apiKey: geminiKey });
  }, [invokeTool, geminiKey]);

  const setOpenAiKey = useCallback((key: string) => {
    localStorage.setItem('openai_key', key);
    setOpenAiKeyState(key);
  }, []);

  const setAnthropicKey = useCallback((key: string) => {
    localStorage.setItem('anthropic_key', key);
    setAnthropicKeyState(key);
  }, []);

  const setGeminiKey = useCallback((k:string)=>{ localStorage.setItem('gemini_key',k); setGeminiKeyState(k); },[]);

  const setZapierWebhook = useCallback((url: string) => {
    localStorage.setItem('zapier_webhook', url);
    setZapierWebhookState(url);
  }, []);

  const setZapierMcpUrl = useCallback((url: string) => {
    localStorage.setItem('zapier_mcp_url', url);
    setZapierMcpUrlState(url);
  }, []);

  const setClaudeMcpUrl = useCallback((url: string) => {
    localStorage.setItem('claude_mcp_url', url);
    setClaudeMcpUrlState(url);
  }, []);

  const setSupabaseCredsLocal = useCallback((url: string, key: string) => {
    setSupUrlState(url);
    setSupKeyState(key);
    try {
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_key', key);
    } catch {}
  }, []);

  const setGithubPat = useCallback((token:string)=>{
    localStorage.setItem('github_pat', token);
    setGithubPatState(token);
  },[]);

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

  /** Forward arbitrary request to another connection via server */
  const forwardRequest = useCallback(async (originConnId: string, targetConnId: string, inner: MCPMessage) => {
    const outer: MCPMessage = {
      jsonrpc: '2.0', id: Date.now(), method: 'mcp_forward', params: { targetConnectionId: targetConnId, request: inner }
    };
    return sendMessage(originConnId, outer);
  }, [sendMessage]);

  /** Configure Supabase storage creds on backend */
  const setStorageCreds = useCallback(async (connectionId: string, url: string, key: string) => {
    return sendMessage(connectionId, { jsonrpc: '2.0', id: Date.now(), method: 'mcp_setStorageCreds', params: { url, key } });
  }, [sendMessage]);

  /** List resources from backend and merge into local state */
  const listResources = useCallback(async (connectionId: string, filters: any = {}) => {
    const resp = await sendMessage(connectionId, { jsonrpc:'2.0', id:Date.now(), method:'mcp_listResources', params: filters });
    if ('result' in resp && Array.isArray(resp.result)) {
      setResources(resp.result);
    }
    return resp;
  }, [sendMessage]);

  const getResource = useCallback(async (connectionId: string, resourceId: string) => {
    return sendMessage(connectionId, { jsonrpc:'2.0', id: Date.now(), method:'mcp_getResource', params:{ resourceId } });
  }, [sendMessage]);

  const addPrompt = useCallback((prompt: MCPPrompt) => {
    setPrompts(prev => [...prev, prompt]);
  }, []);

  const removePrompt = useCallback((name: string) => {
    setPrompts(prev => prev.filter(p => p.name !== name));
  }, []);

  const triggerZapier = useCallback(async (connectionId: string, payload: any) => {
    const webhookUrl = zapierWebhook;
    if (!webhookUrl) throw new Error('Zapier webhook URL not set');
    return invokeTool(connectionId, 'zapier_trigger_zap', { payload, webhookUrl });
  }, [invokeTool, zapierWebhook]);

  const invokeZapierMCP = useCallback(async (connectionId: string, tool: string, params: any = {}) => {
    if (!zapierMcpUrl) throw new Error('Zapier MCP URL not set');
    return invokeTool(connectionId, 'zapier_mcp_invoke', { tool, params, serverUrl: zapierMcpUrl });
  }, [invokeTool, zapierMcpUrl]);

  const invokeClaudeMCP = useCallback(async (connectionId: string, tool: string, params: any = {}) => {
    if (!claudeMcpUrl) throw new Error('Claude MCP URL not set');
    return invokeTool(connectionId, 'claude_mcp_invoke', { tool, params, serverUrl: claudeMcpUrl });
  }, [invokeTool, claudeMcpUrl]);

  const pruneConnections = useCallback(() => {
    setConnections(prev => prev.filter(c => {
      const cl = (c as any).client as MCPWebSocketClient | undefined;
      return !cl || cl.state === WebSocket.OPEN;
    }));
  }, []);

  return {
    connections,
    resources,
    tools,
    prompts,
    openAiKey,
    anthropicKey,
    geminiKey,
    zapierWebhook,
    zapierMcpUrl,
    claudeMcpUrl,
    supUrl,
    supKey,
    githubPat,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    sendTextResource,
    invokeTool,
    invokeChat,
    invokeClaude,
    invokeGemini,
    sendFileResource,
    forwardRequest,
    setStorageCreds,
    listResources,
    getResource,
    addPrompt,
    removePrompt,
    setOpenAiKey,
    setAnthropicKey,
    setGeminiKey,
    setZapierWebhook,
    setZapierMcpUrl,
    setClaudeMcpUrl,
    setSupabaseCredsLocal,
    setGithubPat,
    triggerZapier,
    invokeZapierMCP,
    invokeClaudeMCP,
    pruneConnections,
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