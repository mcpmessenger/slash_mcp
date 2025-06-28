#!/usr/bin/env node
// Minimal smoke test: initialize → grab session-id → run_command
import fs from 'node:fs';
import fetch from 'node-fetch';

const api = process.env.CLAUDE_MCP_URL || 'http://localhost:8081/mcp';
const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error('Set ANTHROPIC_API_KEY');
  process.exit(1);
}

const baseHdr = {
  'Content-Type': 'application/json',
  'x-api-key': key,
  'anthropic-version': '2023-06-01',
};

async function run() {
  // ① initialize – may return 400 on stateless proxies; ignore success/fail
  const init = await fetch(api, {
    method: 'POST',
    headers: baseHdr,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
  });
  const sid = init.headers.get('mcp-session-id') || crypto.randomUUID();

  // ② invoke run_command with whatever session-id we have
  const res = await fetch(api, {
    method: 'POST',
    headers: { ...baseHdr, 'mcp-session-id': sid },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'mcp_invokeTool',
      params: { toolName: 'run_command', parameters: { command: 'echo hi' } },
    }),
  });

  const text = await res.text();
  const line = `${new Date().toISOString()}  HTTP ${res.status}  ${text}\n`;
  fs.appendFileSync('debug-log.txt', line);

  // Parse and validate result so CI can fail loudly
  let ok = false;
  try {
    const json = JSON.parse(text);
    ok = res.ok && json?.result?.stdout?.trim() === 'hi' && json?.result?.exitCode === 0;
  } catch (_) {
    // invalid JSON
    ok = false;
  }

  console.log(line.trim());

  if (!ok) {
    if (res.status === 404 && /Session not found/i.test(text)) {
      console.error(
        'Claude MCP smoke test FAILED – proxy requires a valid mcp-session-id. Try restarting it with --stateless or ensure initialize returns a session id.',
      );
    } else {
      console.error('Claude MCP smoke test FAILED');
    }
    process.exit(1);
  }
  console.log('Claude MCP smoke test passed ✅');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
