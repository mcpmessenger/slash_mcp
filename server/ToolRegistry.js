// ToolRegistry.js - central registry for MCP tool definitions
// Each tool has: name, description, inputSchema (zod), handler (async fn)
// The registry is intentionally dependency-free except for zod for schema validation.
// It can be imported from both ESM and CJS (Node flag --experimental-modules is enabled).
import { z } from 'zod';

/**
 * @typedef {Object} ToolDescriptor
 * @property {string} name – unique tool name.
 * @property {string} description – human-readable description.
 * @property {import('zod').ZodTypeAny} [inputSchema] – optional Zod schema for parameters.
 * @property {(params: any, ctx: any) => Promise<any>|any} handler – business logic.
 */

export class ToolRegistry {
  constructor() {
    /** @type {Map<string, ToolDescriptor>} */
    this._tools = new Map();
  }

  /**
   * Register (or overwrite) a tool definition.
   * @param {ToolDescriptor} tool
   */
  register(tool) {
    if (!tool?.name || typeof tool.name !== 'string') {
      throw new Error('Tool must have a .name string');
    }
    if (this._tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Overwriting existing tool ${tool.name}`);
    }
    this._tools.set(tool.name, tool);
  }

  /**
   * Returns true if a tool is registered.
   * @param {string} name
   */
  has(name) {
    return this._tools.has(name);
  }

  /**
   * Return descriptions for all registered tools – consumable by mcp_getCapabilities.
   */
  list() {
    return Array.from(this._tools.values()).map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema: inputSchema ? (inputSchema.toJSON?.() ?? undefined) : undefined,
    }));
  }

  /**
   * Validate params and invoke tool handler.
   * @param {string} name
   * @param {any} params
   * @param {any} ctx – arbitrary context (socket, user info, etc.)
   * @returns {Promise<{ result?: any, error?: { code: number, message: string, data?: any } }>} JSON-RPC compliant object without id/jsonrpc.
   */
  async invoke(name, params, ctx = {}) {
    const tool = this._tools.get(name);
    if (!tool) {
      return { error: { code: -32011, message: `Tool ${name} not found` } };
    }

    if (tool.inputSchema) {
      try {
        params = tool.inputSchema.parse(params ?? {});
      } catch (err) {
        return {
          error: { code: -32602, message: 'Invalid params', data: err.errors ?? err.message },
        };
      }
    }

    try {
      const output = await tool.handler(params ?? {}, ctx);
      return { result: output };
    } catch (err) {
      // If handler threw a structured RPC error, bubble it. Otherwise generic.
      if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
        return { error: err };
      }
      return { error: { code: -32000, message: err?.message ?? 'Tool execution failed' } };
    }
  }
}

// Provide a singleton registry for convenience.
export const registry = new ToolRegistry();
