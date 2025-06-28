import { GoogleGenerativeAI } from '@google/generative-ai';

export async function chat({ socket, execId, prompt, apiKey, model = 'gemini-pro' }) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY);
    if (!genAI) throw new Error('Gemini API key missing');
    const modelRef = genAI.getGenerativeModel({ model });
    const result = await modelRef.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text)
        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'mcp_streamOutput',
            params: { execId, chunk: text },
          }),
        );
    }
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'mcp_execComplete',
        params: { execId, status: 'success' },
      }),
    );
  } catch (err) {
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'mcp_streamOutput',
        params: { execId, chunk: `Error: ${err.message}` },
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
