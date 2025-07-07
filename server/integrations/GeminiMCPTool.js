import { z } from 'zod';
import { registry } from '../ToolRegistry.js';
import { chat as geminiChat } from '../adapters/gemini.js';

// Define input schema
const schema = z.object({
  prompt: z.string(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

registry.register({
  name: 'gemini_chat',
  description: 'Generate a completion using Google Gemini models',
  inputSchema: schema,
  /**
   * @param {object} params
   * @param {string} params.prompt
   * @param {string} [params.apiKey]
   * @param {string} [params.model]
   * @param {object} ctx Context injected by server/index.js – includes socket
   */
  handler: async (params, ctx) => {
    const { prompt, apiKey, model } = params;
    const { socket } = ctx;
    const execId = `gemini-${Date.now()}`;
    // Run chat streaming; function will push chunks via socket
    geminiChat({ socket, execId, prompt, apiKey, model });
    return { execId };
  },
});
