import { registry } from '../ToolRegistry.js';
import { z } from 'zod';

/**
 * Zapier MCP Tool – bridges our MCP server to a Zapier-hosted MCP server.
 *
 * Input parameters:
 *  - tool:   The Zapier tool (Zap) key to invoke (string, required)
 *  - params: Arbitrary parameters object to pass to the tool (optional)
 *  - serverUrl: Optional override for the Zapier MCP server URL. If omitted we fall back to env ZAPIER_MCP_URL.
 */

const mcpSchema = z.object({
  tool: z.string(),
  params: z.any().optional(),
  serverUrl: z.string().url().optional(),
});

function getServerUrl(override) {
  return override || process.env.ZAPIER_MCP_URL || null;
}

registry.register({
  name: 'zapier_mcp_invoke',
  description: 'Invoke a Zap exposed by your Zapier MCP server.',
  inputSchema: mcpSchema,
  /**
   * @param {{tool: string, params?: any, serverUrl?: string}} args
   */
  handler: async ({ tool, params = {}, serverUrl }) => {
    const url = getServerUrl(serverUrl);
    if (!url) {
      throw { code: -32040, message: 'Zapier MCP server URL not configured' };
    }

    // Compose JSON-RPC 2.0 request body expected by Zapier MCP.
    const rpcReq = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'mcp_invokeTool',
      params: {
        tool,
        params,
      },
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rpcReq),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw { code: -32041, message: `Zapier MCP responded with HTTP ${res.status}`, data: txt };
      }

      /** @type {{jsonrpc:string, id:number, result?:any, error?:{code:number,message:string,data?:any}}} */
      const rpcResp = await res.json();

      if (rpcResp.error) {
        throw { code: rpcResp.error.code ?? -32042, message: rpcResp.error.message ?? 'Zapier MCP error', data: rpcResp.error.data };
      }

      return rpcResp.result;
    } catch (err) {
      if (err?.code) throw err; // Already structured
      throw { code: -32043, message: err.message ?? 'Zapier MCP invocation failed' };
    }
  },
}); 