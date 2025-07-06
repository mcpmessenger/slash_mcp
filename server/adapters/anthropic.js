import { Anthropic } from '@anthropic-ai/sdk';

/**
 * Stream Claude chat completion using MCP notifications
 */
export async function chat({ socket, execId, prompt, apiKey, model = 'gemini-1.0-pro' }) {
  try {
    const anthropic = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
    if (!anthropic.apiKey) throw new Error('Anthropic API key missing');
    if (!anthropic.messages || typeof anthropic.messages.create !== 'function') {
      throw new Error('Anthropic SDK not initialized correctly or incompatible version');
    }

    console.log('Starting Anthropic request...', { prompt, model });
    const stream = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });
    console.log('Received stream from Anthropic');

    for await (const chunk of stream) {
      const delta = chunk?.delta?.text ?? chunk?.content?.[0]?.text ?? '';
      if (delta) {
        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'mcp_streamOutput',
            params: { execId, chunk: delta },
          }),
        );
      }
    }

    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'mcp_execComplete',
        params: { execId, status: 'success' },
      }),
    );
  } catch (err) {
    const msg = err?.message || 'Anthropic error';
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'mcp_streamOutput',
        params: { execId, chunk: `Error: ${msg}` },
      }),
    );
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'mcp_execComplete',
        params: { execId, status: 'error' },
      }),
    );
  }
}
