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
export async function chat({
  socket,
  execId,
  messages,
  prompt,
  apiKey,
  model = 'gpt-3.5-turbo',
  onCompletion,
}) {
  try {
    const openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    if (!openai.apiKey) {
      throw new Error('OpenAI API key missing. Provide via GUI or OPENAI_API_KEY env var.');
    }

    // Back-compat: if caller supplied `prompt` build minimal messages array.
    const msgs =
      Array.isArray(messages) && messages.length > 0
        ? messages
        : [{ role: 'user', content: prompt }];

    const stream = await openai.chat.completions.create({
      model,
      messages: msgs,
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

    // Inform caller of full assistant message so they can extend context.
    if (typeof onCompletion === 'function') {
      try {
        onCompletion(accumulated);
      } catch {}
    }
  } catch (err) {
    const msg = err?.message || 'OpenAI error';
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
