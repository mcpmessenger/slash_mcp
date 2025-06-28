import { registry } from '../ToolRegistry.js';
import { z } from 'zod';

// Lazy load to avoid mandatory dependency during unit tests without OpenAI key
let OpenAIClientCache = null;
async function getClient(apiKey) {
  if (!OpenAIClientCache || OpenAIClientCache.apiKey !== apiKey) {
    const { default: OpenAI } = await import('openai');
    OpenAIClientCache = new OpenAI({ apiKey });
    OpenAIClientCache.apiKey = apiKey;
  }
  return OpenAIClientCache;
}

const openaiSchema = z.object({
  operation: z.enum(['chat_completion', 'create_embedding']).default('chat_completion'),
  model: z.string().optional(),
  // Chat-specific
  messages: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  prompt: z.string().optional(),
  // Embedding-specific
  input: z.union([z.string(), z.array(z.string())]).optional(),
  apiKey: z.string().optional(),
});

registry.register({
  name: 'openai_tool',
  description: 'Access OpenAI Chat or Embedding endpoints',
  inputSchema: openaiSchema,
  handler: async (params) => {
    const {
      operation,
      model = operation === 'chat_completion' ? 'gpt-3.5-turbo' : 'text-embedding-ada-002',
      apiKey: overrideKey,
      messages,
      prompt,
      input,
    } = params;
    const apiKey = overrideKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw { code: -32030, message: 'OpenAI API key not provided' };
    const client = await getClient(apiKey);

    switch (operation) {
      case 'chat_completion': {
        const chatMessages = messages ?? (prompt ? [{ role: 'user', content: prompt }] : null);
        if (!chatMessages) throw { code: -32602, message: 'messages or prompt required' };
        const resp = await client.chat.completions.create({ model, messages: chatMessages });
        return { completion: resp.choices[0].message.content, usage: resp.usage };
      }
      case 'create_embedding': {
        if (input === undefined) throw { code: -32602, message: 'input param required' };
        const resp = await client.embeddings.create({ model, input });
        return {
          embeddings: resp.data.map((d) => d.embedding),
          dimensions: resp.data[0].embedding.length,
        };
      }
      default:
        throw { code: -32602, message: `Unsupported operation ${operation}` };
    }
  },
});
