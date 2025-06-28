import { registry } from '../ToolRegistry.js';
import { z } from 'zod';

/**
 * Claude MCP Tool – bridges our MCP server to a running Claude Code MCP HTTP server.
 *
 * Input parameters:
 *  - tool:        The tool name exposed by Claude (string, required)
 *  - params:      Arbitrary parameters object passed to the tool (optional)
 *  - serverUrl:   Optional override for the Claude MCP server URL. Falls back to env CLAUDE_MCP_URL or http://localhost:8081
 */

const mcpSchema = z.object({
  tool: z.string(),
  params: z.any().optional(),
  serverUrl: z.string().url().optional(),
});

function defaultServerUrl(override) {
  let url = override || process.env.CLAUDE_MCP_URL || 'http://localhost:8081';
  // Ensure the URL ends with the MCP endpoint path so callers don\'t have to remember the suffix
  if (!url.endsWith('/mcp')) {
    // Avoid double slashes
    url = url.replace(/\/+$/, '') + '/mcp';
  }
  return url;
}

console.log('Claude endpoint:', defaultServerUrl());

registry.register({
  name: 'claude_mcp_invoke',
  description: 'Invoke a tool exposed by a Claude Code MCP server.',
  inputSchema: mcpSchema,
  /**
   * @param {{tool:string, params?:any, serverUrl?:string}} args
   * @param {any} _ctx
   */
  handler: async ({ tool, params = {}, serverUrl }, _ctx) => {
    const url = defaultServerUrl(serverUrl);

    // Extract optional apiKey and strip it from params before forwarding
    const { apiKey, ...forwardParams } = params || {};

    // Helper to perform POST JSON-RPC with optional auth header
    const baseHeaders = {
      'Content-Type': 'application/x-ndjson',
      // Some MCP servers require the client to accept SSE streams during first POST
      Accept: 'application/json, text/event-stream',
      'anthropic-version': '2023-06-01',
    };

    // Default API key from env if caller didn't supply one
    const envKey = process.env.ANTHROPIC_API_KEY;

    /** @param {any} body @param {Record<string,string>} extraHeaders */
    const postRpc = async (body, extraHeaders = {}) => {
      const authHeaders = {};
      const keyToUse = apiKey || envKey;
      if (keyToUse) {
        authHeaders['x-api-key'] = keyToUse;
        authHeaders['Authorization'] = `Bearer ${keyToUse}`;
      }
      const payload = JSON.stringify(body) + '\n';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...baseHeaders,
          ...authHeaders,
          ...extraHeaders,
          'Content-Length': Buffer.byteLength(payload, 'utf8').toString(),
        },
        body: payload,
      });
      return res;
    };

    // 1️⃣  Try to obtain a session-id (if the bridge requires it)
    let sessionId;
    try {
      const initBody = { jsonrpc: '2.0', id: Date.now(), method: 'initialize', params: {} };
      const initRes = await postRpc(initBody);
      // capture header (header keys are lowercase in node)
      sessionId = initRes.headers.get('mcp-session-id');
      // Consume body to free the socket; ignore errors – some bridges return 400 for unknown method
      await initRes.text().catch(() => {});
    } catch {}

    // 2️⃣  Compose actual call
    const rpcBody = {
      jsonrpc: '2.0',
      id: Date.now() + 1,
      method: 'tools/call',
      params: {
        name: tool,
        arguments: forwardParams,
      },
    };

    try {
      const res = await postRpc(rpcBody, sessionId ? { 'mcp-session-id': sessionId } : {});

      if (!res.ok) {
        const text = await res.text();
        throw { code: -32051, message: `Claude MCP responded with HTTP ${res.status}`, data: text };
      }

      /**
       * @typedef {Object} RpcResp
       * @property {string} jsonrpc
       * @property {number} id
       * @property {any} [result]
       * @property {{code:number, message:string, data?:any}} [error]
       */
      /** @type {RpcResp} */
      const rpcResp = await res.json();

      if (rpcResp.error) {
        throw {
          code: rpcResp.error.code ?? -32052,
          message: rpcResp.error.message ?? 'Claude MCP error',
          data: rpcResp.error.data,
        };
      }

      return rpcResp.result;
    } catch (err) {
      if (err?.code) throw err; // structured error
      throw { code: -32053, message: err.message ?? 'Claude MCP invocation failed' };
    }
  },
});
