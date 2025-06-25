// Minimal MCP-compatible JSON-RPC 2.0 server over WebSocket
// Run with: npm run backend

import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { promises as fsPromises } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';

const storageDir = path.resolve('storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const PORT = process.env.PORT || 8080;

const ALLOWED_CMDS = ['ping', 'dir', 'ls', 'pwd', 'whoami', 'date', 'echo', 'ipconfig'];

const httpServer = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url && req.url.startsWith('/files/')) {
    const filePath = path.join(storageDir, decodeURIComponent(req.url.replace('/files/', '')));
    if (fs.existsSync(filePath)) {
      const stream = fs.createReadStream(filePath);
      // Basic content-type mapping
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap = { '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.bin': 'application/octet-stream' };
      const ctype = mimeMap[ext] || 'application/octet-stream';
      stream.pipe(res);
      stream.on('open', () => res.writeHead(200, { 'Content-Type': ctype }));
      stream.on('error', () => {
        res.writeHead(500);
        res.end('Error reading file');
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }
  res.writeHead(200);
  res.end('MCP WebSocket server');
});

const wss = new WebSocketServer({ server: httpServer });

// Map client-sent connectionId -> socket
const socketMap = new Map();
// Map forwardedId -> { originSocket, originId }
const forwardMap = new Map();

let resourceCounter = 0;

function getExtFromMime(mime) {
  if (!mime) return '';
  const map = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'text/plain': '.txt' };
  return map[mime] || '';
}

wss.on('connection', (socket) => {
  console.log('Client connected');

  // Helper to relay response back to origin if this is a forwarded id
  const handlePossibleForwardResponse = (msg) => {
    if (msg.id && forwardMap.has(msg.id)) {
      const { originSocket, originId } = forwardMap.get(msg.id);
      forwardMap.delete(msg.id);
      originSocket.send(JSON.stringify({ ...msg, id: originId }));
      return true;
    }
    return false;
  };

  socket.on('message', async (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      return socket.send(
        JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } })
      );
    }

    // If this is a response from a forwarded request, proxy it and stop processing
    if (handlePossibleForwardResponse(message)) return;

    if (!message.method || typeof message.method !== 'string') {
      return socket.send(
        JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32600, message: 'Invalid Request' } })
      );
    }

    const respond = (resultOrError) => {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        ...(resultOrError.error ? { error: resultOrError.error } : { result: resultOrError.result }),
      };
      socket.send(JSON.stringify(response));
    };

    switch (message.method) {
      case 'mcp_sendResource': {
        const { type, content, name, mimeType } = message.params || {};
        if (!type || !content) {
          return respond({ error: { code: -32602, message: 'Missing params' } });
        }
        const resourceId = `res_${++resourceCounter}`;
        if (type === 'text') {
          try {
            const filename = `${resourceId}.txt`;
            const filepath = path.join(storageDir, filename);
            await fsPromises.writeFile(filepath, content, 'utf8');

            const analysis = `Saved ${content.length} characters`;
            const url = `/files/${filename}`;

            return respond({ result: { resourceId, status: 'uploaded', analysis, url } });
          } catch (err) {
            return respond({ error: { code: -32002, message: 'Text write failed', data: err.message } });
          }
        }
        if (type === 'binary') {
          try {
            const buffer = Buffer.from(content, 'base64');
            const ext = getExtFromMime(mimeType) || path.extname(name || '') || '.bin';
            const filename = `${resourceId}${ext}`;
            const filepath = path.join(storageDir, filename);
            await fsPromises.writeFile(filepath, buffer);
            const url = `/files/${filename}`;
            return respond({ result: { resourceId, status: 'uploaded', url } });
          } catch (err) {
            return respond({ error: { code: -32001, message: 'File write failed', data: err.message } });
          }
        }
        return respond({ error: { code: -32602, message: 'Unknown resource type' } });
      }

      case 'mcp_invokeTool': {
        const { toolName, parameters } = message.params || {};
        if (toolName === 'openai_chat') {
          const { prompt, apiKey, model } = parameters || {};
          if (!prompt) {
            return respond({ error: { code: -32602, message: 'prompt param required' } });
          }

          const execId = `chat_${Date.now()}`;
          // respond immediately with execId so client can attach listeners
          respond({ result: { execId } });

          // kick off streaming asynchronously
          import('./adapters/openai.js').then(({ chat }) => {
            chat({ socket, execId, prompt, apiKey, model });
          });
          return; // early return so we don't fall through
        }
        if (toolName === 'shell_execute') {
          const { command } = parameters || {};
          if (!command) return respond({ error: { code: -32602, message: 'command param required' } });
          const cmdParts = command.trim().split(/\s+/);
          const baseCmd = cmdParts[0];
          if (!ALLOWED_CMDS.includes(baseCmd)) {
            return respond({ error: { code: -32005, message: 'Command not allowed' } });
          }

          // Simple OS-aware munging for ping count flag
          let finalCmd = command;
          if (baseCmd === 'ping') {
            if (process.platform === 'win32') {
              finalCmd = command.replace(/-c\s+(\d+)/, '-n $1');
            } else {
              finalCmd = command.replace(/-n\s+(\d+)/, '-c $1');
            }
          }

          // Use finalCmd instead of command
          const execId = `exec_${Date.now()}`;
          const { spawn } = await import('node:child_process');
          const child = spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [process.platform === 'win32' ? '/c' : '-c', finalCmd], { shell: false });

          const timeoutMs = 5000;
          const killTimer = setTimeout(() => {
            child.kill('SIGTERM');
          }, timeoutMs);

          child.stdout.on('data', (chunk) => {
            socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'mcp_streamOutput', params: { execId, chunk: chunk.toString() } }));
          });
          child.stderr.on('data', (chunk) => {
            socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'mcp_streamOutput', params: { execId, chunk: chunk.toString() } }));
          });

          child.on('close', (code) => {
            clearTimeout(killTimer);
            socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'mcp_execComplete', params: { execId, status: code === 0 ? 'success' : 'error' } }));
          });

          // store reference for abort
          socket.execMap = socket.execMap || {};
          socket.execMap[execId] = child;

          return respond({ result: { execId } });
        }

        if (toolName === 'abort_exec') {
          const { execId } = parameters || {};
          if (!execId) return respond({ error: { code: -32602, message: 'execId required' } });
          if (socket.execMap && socket.execMap[execId]) {
            socket.execMap[execId].kill('SIGTERM');
            delete socket.execMap[execId];
            return respond({ result: { status: 'aborted' } });
          }
          return respond({ error: { code: -32004, message: 'execId not found' } });
        }

        if (toolName === 'anthropic_chat') {
          const { prompt, apiKey, model } = parameters || {};
          if (!prompt) return respond({ error: { code: -32602, message: 'prompt param required' } });
          const execId = `claude_${Date.now()}`;
          respond({ result: { execId } });
          import('./adapters/anthropic.js').then(({ chat }) => chat({ socket, execId, prompt, apiKey, model }));
          return;
        }

        if (toolName === 'gemini_chat') {
          const { prompt, apiKey, model } = parameters || {};
          if (!prompt) return respond({ error: { code: -32602, message: 'prompt param required' } });
          const execId = `gemini_${Date.now()}`;
          respond({ result: { execId } });
          import('./adapters/gemini.js').then(({ chat }) => chat({ socket, execId, prompt, apiKey, model }));
          return;
        }

        // Default echo tool
        return respond({ result: { toolOutput: `Executed ${toolName} with ${JSON.stringify(parameters)}`, executionStatus: 'success' } });
      }

      case 'mcp_getCapabilities': {
        return respond({
          result: {
            resources: [],
            tools: [
              {
                name: 'shell_execute',
                description: 'Execute shell command on server',
                inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
              },
              {
                name: 'openai_chat',
                description: 'LLM chat completion (OpenAI)',
                inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, apiKey: { type: 'string' }, model: { type: 'string' } }, required: ['prompt'] },
              },
              {
                name: 'anthropic_chat',
                description: 'LLM chat completion (Claude)',
                inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, apiKey: { type: 'string' }, model: { type: 'string' } }, required: ['prompt'] },
              },
              {
                name: 'gemini_chat',
                description: 'LLM chat completion (Gemini)',
                inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, apiKey: { type: 'string' }, model: { type: 'string' } }, required: ['prompt'] },
              },
            ],
            prompts: [],
          },
        });
      }

      case 'mcp_register': {
        const { connectionId } = message.params || {};
        if (connectionId) socketMap.set(connectionId, socket);
        return respond({ result: { status: 'registered' } });
      }

      case 'mcp_forward': {
        // Execute the inner request on behalf of targetSocket so output / notifications
        // naturally stream to that client. For now we support only mcp_invokeTool.

        if (message.params && message.params.request) {
          const request = message.params.request;
          const targetConnectionId = message.params.targetConnectionId;
          if (!targetConnectionId || !request) return respond({ error: { code: -32602, message: 'Missing params' } });
          const targetSocket = socketMap.get(targetConnectionId);
          if (!targetSocket) return respond({ error: { code: -32010, message: 'targetConnectionId not found' } });

          // Reuse existing invokeTool switch by calling with synthetic message
          const savedMessage = message; // keep ref if needed
          message = request; // set message for reuse of logic below
          socket = targetSocket; // route notifications to target pane
          // fall through to switch-case 'mcp_invokeTool' below by recursion
          // We will respond success immediately to origin
          respond({ result: { status: 'forwarded' } });
          // Now process as normal to produce notifications on targetSocket
          // (wrap in try/catch to avoid crashing)
          try {
            // using switch-case requires putting code here; easier: directly call same handling for mcp_invokeTool.
            const { toolName, parameters } = request.params || {};
            // duplicated minimal handling for shell_execute, openai_chat, anthropic_chat
            const relayRespond = ()=>{}; // no-op
            switch(toolName){
              case 'shell_execute': {
                const { command } = parameters || {};
                if(!command) break;
                const cmdParts=command.trim().split(/\s+/);
                const baseCmd=cmdParts[0];
                if(!ALLOWED_CMDS.includes(baseCmd)) break;
                let finalCmd=command;
                if(baseCmd==='ping'){
                  if(process.platform==='win32') finalCmd=command.replace(/-c\s+(\d+)/,'-n $1');
                  else finalCmd=command.replace(/-n\s+(\d+)/,'-c $1');
                }
                const execId=`exec_${Date.now()}`;
                const { spawn }=await import('node:child_process');
                const child=spawn(process.platform==='win32'?'cmd.exe':'bash',[process.platform==='win32'?'/c':'-c',finalCmd],{shell:false});
                child.stdout.on('data',chunk=>{
                  targetSocket.send(JSON.stringify({jsonrpc:'2.0',method:'mcp_streamOutput',params:{execId,chunk:chunk.toString()}}));
                });
                child.stderr.on('data',chunk=>{
                  targetSocket.send(JSON.stringify({jsonrpc:'2.0',method:'mcp_streamOutput',params:{execId,chunk:chunk.toString()}}));
                });
                child.on('close',code=>{
                  targetSocket.send(JSON.stringify({jsonrpc:'2.0',method:'mcp_execComplete',params:{execId,status:code===0?'success':'error'}}));
                });
                break;
              }
              case 'openai_chat': {
                const { prompt, apiKey, model }=parameters||{};
                if(!prompt) break;
                const execId=`chat_${Date.now()}`;
                targetSocket.send(JSON.stringify({jsonrpc:'2.0',method:'mcp_streamOutput',params:{execId,chunk:'[OpenAI chat forwarding…]'}}));
                import('./adapters/openai.js').then(({chat})=>chat({socket:targetSocket,execId,prompt,apiKey,model}));
                break;
              }
              case 'anthropic_chat': {
                const { prompt, apiKey, model }=parameters||{};
                if(!prompt) break;
                const execId=`claude_${Date.now()}`;
                targetSocket.send(JSON.stringify({jsonrpc:'2.0',method:'mcp_streamOutput',params:{execId,chunk:'[Claude chat forwarding…]'}}));
                import('./adapters/anthropic.js').then(({chat})=>chat({socket:targetSocket,execId,prompt,apiKey,model}));
                break;
              }
            }
          }catch{}
          return;
        }

        // Fallback: forward as raw request and pipe response back
        const forwardId = message.id ?? `fwd_${Date.now()}`;
        message.id = forwardId;
        forwardMap.set(forwardId, { originSocket: socket, originId: message.id });
        socket.send(JSON.stringify(message));
        return;
      }

      default:
        return respond({ error: { code: -32601, message: 'Method not found' } });
    }
  });

  socket.on('close', () => console.log('Client disconnected'));
});

httpServer.listen(PORT, () => {
  console.log(`MCP WebSocket server listening on ws://localhost:${PORT}`);
  console.log(`Serving uploaded files at http://localhost:${PORT}/files/<filename>`);
}); 