import { MCPMessage } from './types/mcp';

// Very small in-memory auto-increment id helper for resources
let resourceCounter = 0;

/**
 * Handle a JSON-RPC request locally and synchronously.
 * This mocks what a real MCP server would do so that the client can be
 * developed in isolation.
 */
export function handleRequest(request: MCPMessage): MCPMessage {
  const { method, params, id } = request;

  if (method === 'mcp_sendResource') {
    if (params?.type === 'text') {
      const analysis = `The text contains ${params.content.length} characters.`;

      return {
        jsonrpc: '2.0',
        id,
        result: {
          resourceId: `res_${++resourceCounter}`,
          status: 'processed',
          analysis,
        },
      } as const;
    }

    if (params?.type === 'binary') {
      const size = params.content?.byteLength ?? 0;
      return {
        jsonrpc: '2.0',
        id,
        result: {
          resourceId: `res_${++resourceCounter}`,
          status: 'uploaded',
          info: `Received binary blob of ${size} bytes`,
        },
      } as const;
    }
  }

  if (method === 'mcp_invokeTool') {
    const { toolName, parameters } = params ?? {};
    // Very naive mock – echo tool name & parameters
    return {
      jsonrpc: '2.0',
      id,
      result: {
        toolOutput: `Executed tool «${toolName}» with params ${JSON.stringify(parameters)}`,
        executionStatus: 'success',
      },
    } as const;
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: 'Method not found',
      data: `The requested MCP method '${method}' does not exist.`,
    },
  } as const;
}
