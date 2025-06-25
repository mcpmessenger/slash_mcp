import OpenAI from 'openai';

/**
 * Stream chat completion to client using mcp_streamOutput notifications.
 * @param {Object} opts
 * @param {WebSocket} opts.socket - Target websocket connection
 * @param {string} opts.execId - Unique id to include in stream notifications
 * @param {string} opts.prompt - User prompt
 * @param {string} [opts.apiKey] - Optional API key (falls back to env)
 * @param {string} [opts.model] - Model name
 */
export async function chat({ socket, execId, prompt, apiKey, model = 'gpt-3.5-turbo' }) {
  try {
    const openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    if (!openai.apiKey) {
      throw new Error('OpenAI API key missing. Provide via GUI or OPENAI_API_KEY env var.');
    }

    const stream = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    let accumulated = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content ?? '';
      if (delta) {
        accumulated += delta;
        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'mcp_streamOutput',
            params: { execId, chunk: delta },
          })
        );
      }
    }

    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'mcp_execComplete',
        params: { execId, status: 'success' },
      })
    );
  } catch (err) {
    const msg = err?.message || 'OpenAI error';
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'mcp_streamOutput',
        params: { execId, chunk: `Error: ${msg}` },
      })
    );
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'mcp_execComplete',
        params: { execId, status: 'error' },
      })
    );
  }
} 