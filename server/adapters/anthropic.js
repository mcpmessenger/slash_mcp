import Anthropic from '@anthropic-ai/sdk';

/**
 * Stream Claude chat completion using MCP notifications
 */
export async function chat({ socket, execId, prompt, apiKey, model = 'claude-3-haiku-20240229' }) {
  try {
    const anthropic = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
    if (!anthropic.apiKey) throw new Error('Anthropic API key missing');

    const stream = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk?.delta?.text ?? chunk?.content?.[0]?.text ?? '';
      if (delta) {
        socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'mcp_streamOutput', params: { execId, chunk: delta } }));
      }
    }

    socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'mcp_execComplete', params: { execId, status: 'success' } }));
  } catch (err) {
    const msg = err?.message || 'Anthropic error';
    socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'mcp_streamOutput', params: { execId, chunk: `Error: ${msg}` } }));
    socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'mcp_execComplete', params: { execId, status: 'error' } }));
  }
} 