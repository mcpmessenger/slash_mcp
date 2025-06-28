#!/usr/bin/env node

import { spawn } from 'node:child_process';

const bin = process.env.CLAUDE_BIN || 'claude';
const proxyCmd = 'mcp-proxy';
const proxyArgs = ['--stateless', '--server', 'stream', '--port', '8081', bin, 'mcp', 'serve'];

const child = spawn('npx', ['--yes', proxyCmd, ...proxyArgs], {
  stdio: 'inherit',
  shell: false,
});

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error(
      `Cannot find command '${bin}'.\nInstall Claude Code globally: npm i -g @anthropic-ai/claude-code \nOr set CLAUDE_BIN to the full path of the executable.`,
    );
  } else {
    console.error('Failed to launch mcp-proxy:', err.message);
  }
  process.exit(1);
});

child.on('exit', (code) => process.exit(code ?? 1));
