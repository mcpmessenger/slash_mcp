#!/usr/bin/env node
import WebSocket from 'ws';

const SERVER_URL = process.env.MCP_URL || 'ws://localhost:8080';
const COMMANDS = ['echo hello', 'date', 'whoami', 'pwd', 'ls'];

function sendRpc(ws, msg) {
  return new Promise((resolve) => {
    const id = msg.id;
    const listener = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.off('message', listener);
          resolve(res);
        }
      } catch {}
    };
    ws.on('message', listener);
    ws.send(JSON.stringify(msg));
  });
}

(async () => {
  const ws = new WebSocket(SERVER_URL);
  await new Promise((res, rej) => {
    ws.on('open', res);
    ws.on('error', rej);
  });
  console.log('Connected to', SERVER_URL);

  // register connection
  await sendRpc(ws, { jsonrpc:'2.0', id:1, method:'mcp_register', params:{ connectionId:'smoke-'+Date.now() } });

  const results = [];
  for (let i=0;i<COMMANDS.length;i++) {
    const cmd = COMMANDS[i];
    const id = Date.now()+i;
    const resp = await sendRpc(ws, { jsonrpc:'2.0', id, method:'mcp_invokeTool', params:{ toolName:'shell_execute', parameters:{ command:cmd } } });
    if (resp.error) {
      results.push({ cmd, pass:false, error: resp.error.message });
    } else if (resp.result && resp.result.execId) {
      // Wait for mcp_execComplete
      const execId = resp.result.execId;
      const status = await new Promise((resolve) => {
        const listener = (data) => {
          try {
            const msg = JSON.parse(data);
            if (msg.method==='mcp_execComplete' && msg.params?.execId===execId) {
              ws.off('message', listener);
              resolve(msg.params.status);
            }
          } catch {}
        };
        ws.on('message', listener);
      });
      results.push({ cmd, pass: status==='success', status });
    } else {
      results.push({ cmd, pass:true });
    }
  }
  ws.close();
  console.table(results);
  const anyPass = results.some(r=>r.pass);
  process.exit(anyPass?0:1);
})(); 