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
      stream.pipe(res);
      stream.on('open', () => res.writeHead(200));
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

let resourceCounter = 0;

function getExtFromMime(mime) {
  if (!mime) return '';
  const map = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'text/plain': '.txt' };
  return map[mime] || '';
}

wss.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('message', async (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      return socket.send(
        JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } })
      );
    }

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
          const analysis = `Received ${content.length} characters`;
          return respond({ result: { resourceId, status: 'processed', analysis } });
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

          child.stdout.on('data', (chunk) => {
            socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'mcp_streamOutput', params: { execId, chunk: chunk.toString() } }));
          });
          child.stderr.on('data', (chunk) => {
            socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'mcp_streamOutput', params: { execId, chunk: chunk.toString() } }));
          });

          child.on('close', (code) => {
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
            ],
            prompts: [],
          },
        });
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