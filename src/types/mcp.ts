// MCP Protocol Types
export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  data?: string | ArrayBuffer;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPServer {
  name: string;
  version: string;
  capabilities: {
    resources?: boolean;
    tools?: boolean;
    prompts?: boolean;
    sampling?: boolean;
  };
}

export interface MCPConnection {
  id: string;
  server: MCPServer;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastActivity: Date;
}