import { GoogleGenerativeAI } from '@google/generative-ai';

export async function chat({ socket, execId, prompt, apiKey, model = 'gemini-2.5-pro' }) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY);
    if (!genAI) throw new Error('Gemini API key missing');
    const modelRef = genAI.getGenerativeModel({ model });
    console.log('Starting Gemini request...');
    const result = await modelRef.generateContentStream(prompt);
    console.log('Received stream from Gemini');
    for await (const chunk of result.stream) {
      console.log('Streaming chunk:', chunk);
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
    console.log('Gemini request complete');
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
