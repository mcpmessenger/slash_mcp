// Minimal MCP-compatible JSON-RPC 2.0 server over WebSocket
// Run with: npm run backend

import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { promises as fsPromises } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { getSupabase, initSupabase } from './supabaseClient.js';
import { z } from 'zod';
import {
  PORT,
  ALLOWED_CMDS,
  JWT_SECRET,
  AUTH_OPTIONAL,
  ALLOW_ALL_COMMANDS,
  VALID_API_KEYS,
} from './config.js';
import { registry } from './ToolRegistry.js';
import './integrations/ZapierTool.js';
import './integrations/OpenAITool.js';
import './integrations/ZapierMCPTool.js';
import './integrations/ClaudeMCPTool.js';
import './integrations/GitHubMCPTool.js';
import './integrations/SupabaseMCPTool.js';
import './integrations/GeminiMCPTool.js';
import logger from './logger.js';
import { sanitizeFilename, sanitizeString, sanitizeShellInput } from './utils/sanitize.js';

console.log('env OPENAI?', !!process.env.OPENAI_API_KEY);
console.log('env ZAP?', process.env.ZAPIER_WEBHOOK_URL);

const storageDir = path.resolve('storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const httpServer = createServer(async (req, res) => {
  // Health-check endpoint for load-balancers / readiness probes
  if (req.method === 'GET' && req.url === '/healthz') {
    try {
      const tools = registry.list ? registry.list() : Object.values(registry.tools || {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          timestamp: Date.now(),
          tools: Array.isArray(tools)
            ? tools.map((t) => (typeof t === 'string' ? t : t?.name || 'unknown'))
            : [],
        }),
      );
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err?.message || 'internal' }));
    }
    return;
  }

  if (req.method === 'GET' && req.url && req.url.startsWith('/files/')) {
    const filePath = path.join(storageDir, decodeURIComponent(req.url.replace('/files/', '')));
    if (fs.existsSync(filePath)) {
      const stream = fs.createReadStream(filePath);
      // Basic content-type mapping
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap = {
        '.txt': 'text/plain',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.bin': 'application/octet-stream',
      };
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

// If env has Supabase creds, initialize immediately
// Map client-sent connectionId -> socket
const socketMap = new Map();
// NEW: Map logical agentId -> connectionId
const agentRegistry = new Map();
// Simple in-memory conversation history: Map<conversationId, Array<{speaker, message}>>
const conversationContexts = new Map();
// Map forwardedId -> { originSocket, originId }
const forwardMap = new Map();
// Map execId -> originSocket for relaying streamOutput / execComplete
const execRelayMap = new Map();

let resourceCounter = 0;

// --- Enhanced RBAC mapping (tool -> allowed operations, true=all) ---
const ROLE_PERMS = {
  guest: {
    // guests only read-only tools, extend later
  },
  developer: {
    shell_execute: true,
    openai_chat: true,
    anthropic_chat: true,
    gemini_chat: true,
    zapier_trigger_zap: true,
    zapier_mcp_invoke: true,
    github_mcp_tool: true,
    supabase_mcp_tool: ['select', 'insert', 'update', 'delete', 'list_files', 'download_file'],
  },
  admin: {
    shell_execute: true,
    openai_chat: true,
    anthropic_chat: true,
    gemini_chat: true,
    zapier_trigger_zap: true,
    zapier_mcp_invoke: true,
    github_mcp_tool: true,
    supabase_mcp_tool: true, // admins get full supabase control
  },
  ai_agent: {
    shell_execute: true,
    openai_chat: true,
    anthropic_chat: true,
    gemini_chat: true,
    zapier_trigger_zap: true,
    zapier_mcp_invoke: true,
    github_mcp_tool: true,
    supabase_mcp_tool: ['select'], // agents only read data by default
  },
};

export function roleAllows(role, tool, operation = null) {
  if (AUTH_OPTIONAL && role === 'guest') return true;
  const roleMap = ROLE_PERMS[role];
  if (!roleMap) return false;
  const rule = roleMap[tool];
  if (rule === undefined) return false; // not listed
  if (rule === true) return true; // full access to tool
  if (Array.isArray(rule)) {
    // If no specific operation requested treat like denied unless empty array means all
    if (!operation) return false;
    return rule.includes(operation);
  }
  return false;
}

function getExtFromMime(mime) {
  if (!mime) return '';
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'text/plain': '.txt',
  };
  return map[mime] || '';
}

// ----------------- Zod Schemas for MCP methods -----------------
export const schemas = {
  mcp_sendResource: z.object({
    type: z.enum(['text', 'binary']),
    content: z.string(),
    name: z.string().optional(),
    mimeType: z.string().optional(),
  }),
  mcp_invokeTool: z.object({
    toolName: z.string(),
    parameters: z.any(),
  }),
  mcp_setStorageCreds: z.object({
    url: z.string().url(),
    key: z.string(),
  }),
  mcp_getResource: z.object({
    resourceId: z.string(),
  }),
  mcp_listResources: z.object({
    mimeType: z.string().optional(),
    uploader: z.string().optional(),
  }),
};

// Rate-limiting settings (can be overridden by env vars)
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 min
const MAX_MSGS_PER_WINDOW = parseInt(process.env.MAX_MSGS_PER_WINDOW || '60', 10); // 60 msgs

wss.on('connection', (socket, req) => {
  // Send initial status notification
  try {
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'connection_status',
        params: { status: 'connected' },
      }),
    );
  } catch {}

  // --- Heartbeat / ping-pong liveness check ---
  const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000', 10); // 30s default
  socket.isAlive = true;
  socket.on('pong', () => {
    socket.isAlive = true;
  });
  const hbTimer = setInterval(() => {
    if (socket.readyState !== socket.OPEN) return; // Closed elsewhere
    if (!socket.isAlive) {
      console.warn('Terminating unresponsive socket');
      return socket.terminate();
    }
    socket.isAlive = false;
    try {
      socket.ping();
    } catch {}
  }, HEARTBEAT_INTERVAL);

  // Optional JWT verification
  try {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const tokenParam = url.searchParams.get('token');
    const wsProtocolHeader = req.headers['sec-websocket-protocol']?.toString();
    const tokenHeader = wsProtocolHeader?.startsWith('Bearer ')
      ? wsProtocolHeader.split('Bearer ')[1]
      : '';

    const apiKey = req.headers['x-api-key'] || url.searchParams.get('api_key');

    if (apiKey) {
      if (!VALID_API_KEYS.length || VALID_API_KEYS.includes(apiKey)) {
        socket.role = 'developer';
      } else {
        socket.close(4003, 'invalid api key');
        return;
      }
    } else if (tokenParam || tokenHeader) {
      const token = tokenParam || tokenHeader;
      const payload = jwt.verify(token, JWT_SECRET);
      socket.jwtPayload = payload;
      socket.role = payload.role ?? 'guest';
    } else if (!AUTH_OPTIONAL) {
      socket.close(4001, 'auth required');
      return;
    } else {
      socket.role = 'guest';
    }
  } catch (err) {
    socket.close(4002, 'invalid token');
    return;
  }

  console.log('Client connected');
  logger.info('Client connected', { remoteIp: req.socket.remoteAddress });

  // Helper to relay response back to origin if this is a forwarded id
  const handlePossibleForwardResponse = (msg) => {
    if (msg.id && forwardMap.has(msg.id)) {
      const { originSocket, originId } = forwardMap.get(msg.id);
      forwardMap.delete(msg.id);

      // If this response includes an execId, track it for relay of subsequent notifications
      if (msg.result && msg.result.execId) {
        execRelayMap.set(msg.result.execId, originSocket);
      }

      originSocket.send(JSON.stringify({ ...msg, id: originId }));
      return true;
    }
    return false;
  };

  // Relay streaming notifications to origin if execId is known
  const maybeRelayStream = (msg) => {
    if (msg.method && (msg.method === 'mcp_streamOutput' || msg.method === 'mcp_execComplete')) {
      const execId = msg.params?.execId;
      if (execId && execRelayMap.has(execId)) {
        const originSocket = execRelayMap.get(execId);
        // If exec has completed, clean map
        if (msg.method === 'mcp_execComplete') {
          execRelayMap.delete(execId);
        }
        // Forward notification unchanged
        try {
          originSocket.send(JSON.stringify(msg));
        } catch {}
      }
    }
  };

  socket.on('message', async (data) => {
    // ---- Basic per-connection rate limiting ----
    const now = Date.now();
    if (!socket._rateWindowStart || now - socket._rateWindowStart > RATE_LIMIT_WINDOW_MS) {
      socket._rateWindowStart = now;
      socket._rateCount = 0;
    }
    socket._rateCount = (socket._rateCount ?? 0) + 1;
    if (socket._rateCount > MAX_MSGS_PER_WINDOW) {
      return socket.send(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32008,
            message: `Rate limit exceeded – max ${MAX_MSGS_PER_WINDOW} messages per ${RATE_LIMIT_WINDOW_MS / 1000}s`,
          },
        }),
      );
    }

    let message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      return socket.send(
        JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }),
      );
    }

    // Stream relay check (notifications have no id)
    maybeRelayStream(message);

    // If this is a response from a forwarded request, proxy it and stop processing
    if (handlePossibleForwardResponse(message)) return;

    if (!message.method || typeof message.method !== 'string') {
      return socket.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32600, message: 'Invalid Request' },
        }),
      );
    }

    // -------- Param validation --------
    if (schemas[message.method]) {
      const schema = schemas[message.method];
      try {
        schema.parse(message.params || {});
      } catch (err) {
        return socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            error: { code: -32602, message: 'Invalid params', data: err.errors || err.message },
          }),
        );
      }
    }

    const respond = (resultOrError) => {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        ...(resultOrError.error
          ? { error: resultOrError.error }
          : { result: resultOrError.result }),
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

            // Sanitize user-supplied strings
            const safeName = sanitizeFilename(name || '');
            const safeMime = sanitizeString(mimeType || '');

            if (getSupabase()) {
              try {
                const uploadName = `${resourceId}.txt`;
                await getSupabase()
                  .storage.from('resources')
                  .upload(uploadName, content, { contentType: 'text/plain', upsert: true });
                const { data: pubData } = getSupabase()
                  .storage.from('resources')
                  .getPublicUrl(uploadName);
                const supaUrl = pubData?.publicUrl || url;
                await getSupabase()
                  .from('resources')
                  .insert({
                    id: resourceId,
                    name: safeName,
                    mime_type: safeMime || 'text/plain',
                    path: uploadName,
                    uploader: socket.agentId ?? socket.connectionId,
                  });
                return respond({
                  result: { resourceId, status: 'uploaded', analysis, url: supaUrl },
                });
              } catch (e) {
                console.error('Supabase text upload failed', e);
              }
            }
            return respond({ result: { resourceId, status: 'uploaded', analysis, url } });
          } catch (err) {
            return respond({
              error: { code: -32002, message: 'Text write failed', data: err.message },
            });
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

            // Sanitize user-supplied strings
            const safeName = sanitizeFilename(name || '');
            const safeMime = sanitizeString(mimeType || '');

            if (getSupabase()) {
              try {
                // upload file to storage bucket 'resources'
                await getSupabase()
                  .storage.from('resources')
                  .upload(filename, buffer, { contentType: mimeType, upsert: true });
                await getSupabase()
                  .from('resources')
                  .insert({
                    id: resourceId,
                    name: safeName,
                    mime_type: safeMime,
                    path: filename,
                    uploader: socket.agentId ?? socket.connectionId,
                  });
                const { data: pubData } = getSupabase()
                  .storage.from('resources')
                  .getPublicUrl(filename);
                url = pubData?.publicUrl || url;
              } catch (e) {
                console.error('Supabase binary upload failed', e);
              }
            }
            return respond({ result: { resourceId, status: 'uploaded', url } });
          } catch (err) {
            return respond({
              error: { code: -32001, message: 'File write failed', data: err.message },
            });
          }
        }
        return respond({ error: { code: -32602, message: 'Unknown resource type' } });
      }

      case 'mcp_invokeTool': {
        const { toolName, parameters } = message.params || {};

        // Add logging for all tool invocations
        console.log('[mcp_invokeTool] Invoked tool:', toolName, 'with params:', parameters);

        // RBAC enforcement
        const requesterRole = socket.role || 'guest';
        const toolOperation = parameters?.operation ?? null;
        if (!roleAllows(requesterRole, toolName, toolOperation)) {
          return respond({
            error: {
              code: -32013,
              message: `Role ${requesterRole} not permitted for ${toolName}${toolOperation ? '/' + toolOperation : ''}`,
            },
          });
        }

        // Check registry first – if tool is registered there, delegate.
        if (registry.has(toolName)) {
          const rpcRes = await registry.invoke(toolName, parameters, { socket });
          return respond(rpcRes);
        }

        if (toolName === 'openai_chat') {
          const { prompt, apiKey, model } = parameters || {};
          if (!prompt) {
            return respond({ error: { code: -32602, message: 'prompt param required' } });
          }

          const execId = `chat_${Date.now()}`;
          respond({ result: { execId } });

          // --- Basic conversation context ---
          const ctxKey = socket.connectionId || socket._socketId || socket.agentId || socket; // fallback to object ref
          const history = conversationContexts.get(ctxKey) || [];
          const messages = [...history, { role: 'user', content: prompt }].slice(-10); // keep last 10

          import('./adapters/openai.js').then(({ chat }) => {
            chat({
              socket,
              execId,
              messages,
              apiKey: apiKey || process.env.OPENAI_API_KEY,
              model,
              onCompletion: (assistantReply) => {
                // Update conversation history with new assistant message
                const updated = [...messages, { role: 'assistant', content: assistantReply }].slice(
                  -10,
                );
                conversationContexts.set(ctxKey, updated);
              },
            }).catch((err) => {
              console.error('[openai_chat] Error:', err);
            });
          }).catch((err) => {
            console.error('[openai_chat] Import error:', err);
          });

          return; // early return
        }
        if (toolName === 'shell_execute') {
          let { command } = parameters || {};
          if (!command)
            return respond({ error: { code: -32602, message: 'command param required' } });

          // Reject obviously dangerous patterns before further checks
          try {
            command = sanitizeShellInput(command);
          } catch (e) {
            return respond({ error: { code: -32006, message: e.message } });
          }

          const cmdParts = command.trim().split(/\s+/);
          const baseCmd = cmdParts[0];
          if (!ALLOW_ALL_COMMANDS && !ALLOWED_CMDS.includes(baseCmd)) {
            return respond({
              error: {
                code: -32005,
                message: 'Command not allowed',
                data: { allowed: ALLOWED_CMDS },
              },
            });
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

          // Run command inside a sandboxed Docker container (busybox by default)
          const execId = `exec_${Date.now()}`;
          const dockerImage = process.env.MCP_SHELL_IMAGE || 'debian:stable-slim';
          // Build docker args: docker run --rm <image> sh -c "<cmd>"
          const dockerArgs = ['run', '--rm', dockerImage, 'sh', '-c', finalCmd];

          const { spawn } = await import('node:child_process');
          const spawnLocal = () =>
            spawn(
              process.platform === 'win32' ? 'cmd.exe' : 'bash',
              [process.platform === 'win32' ? '/c' : '-c', finalCmd],
              { shell: false },
            );

          let child = spawn('docker', dockerArgs, { shell: false });

          // If docker is missing this event fires with ENOENT
          child.on('error', (err) => {
            if (err.code === 'ENOENT') {
              console.warn('Docker not found – falling back to host shell');
              child = spawnLocal();
            }
          });

          const timeoutMs = 5000;
          const killTimer = setTimeout(() => {
            child.kill('SIGTERM');
          }, timeoutMs);

          child.stdout.on('data', (chunk) => {
            socket.send(
              JSON.stringify({
                jsonrpc: '2.0',
                method: 'mcp_streamOutput',
                params: { execId, chunk: chunk.toString() },
              }),
            );
          });
          child.stderr.on('data', (chunk) => {
            socket.send(
              JSON.stringify({
                jsonrpc: '2.0',
                method: 'mcp_streamOutput',
                params: { execId, chunk: chunk.toString() },
              }),
            );
          });

          child.on('close', (code) => {
            clearTimeout(killTimer);
            socket.send(
              JSON.stringify({
                jsonrpc: '2.0',
                method: 'mcp_execComplete',
                params: { execId, status: code === 0 ? 'success' : 'error' },
              }),
            );
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
          if (!prompt)
            return respond({ error: { code: -32602, message: 'prompt param required' } });
          const execId = `claude_${Date.now()}`;
          respond({ result: { execId } });
          import('./adapters/anthropic.js').then(({ chat }) =>
            chat({ socket, execId, prompt, apiKey: apiKey || process.env.ANTHROPIC_API_KEY, model }).catch((err) => {
              console.error('[anthropic_chat] Error:', err);
            })
          ).catch((err) => {
            console.error('[anthropic_chat] Import error:', err);
          });
          return;
        }

        if (toolName === 'gemini_chat') {
          const { prompt, apiKey, model } = parameters || {};
          if (!prompt)
            return respond({ error: { code: -32602, message: 'prompt param required' } });
          const execId = `gemini_${Date.now()}`;
          respond({ result: { execId } });
          import('./adapters/gemini.js').then(({ chat }) =>
            chat({ socket, execId, prompt, apiKey: apiKey || process.env.GEMINI_API_KEY, model }).catch((err) => {
              console.error('[gemini_chat] Error:', err);
            })
          ).catch((err) => {
            console.error('[gemini_chat] Import error:', err);
          });
          return;
        }

        // Default echo tool
        return respond({
          result: {
            toolOutput: `Executed ${toolName} with ${JSON.stringify(parameters)}`,
            executionStatus: 'success',
          },
        });
      }

      case 'mcp_getCapabilities': {
        const staticTools = [
          {
            name: 'shell_execute',
            description: 'Execute shell command on server',
            inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
          },
          {
            name: 'openai_chat',
            description: 'LLM chat completion (OpenAI)',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: { type: 'string' },
                apiKey: { type: 'string' },
                model: { type: 'string' },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'anthropic_chat',
            description: 'LLM chat completion (Claude)',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: { type: 'string' },
                apiKey: { type: 'string' },
                model: { type: 'string' },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'gemini_chat',
            description: 'LLM chat completion (Gemini)',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: { type: 'string' },
                apiKey: { type: 'string' },
                model: { type: 'string' },
              },
              required: ['prompt'],
            },
          },
        ];
        const toolList = [...staticTools, ...registry.list()];
        console.log(
          'Registered tools:',
          toolList.map((t) => t.name),
        );
        return respond({
          result: {
            resources: [],
            tools: toolList,
            prompts: [
              { name: 'test', description: 'Run automated tests' },
              {
                name: 'describe this image',
                description: 'Generate a textual description for the selected image',
              },
            ],
          },
        });
      }

      case 'mcp_register': {
        // OLD IMPLEMENTATION (connectionId only) has been replaced to support agent IDs and metadata
        const {
          connectionId,
          agentId,
          role = 'ai_agent',
          capabilities = [],
        } = message.params || {};
        if (connectionId) {
          socketMap.set(connectionId, socket);
          socket.connectionId = connectionId; // track on socket for cleanup
        }
        if (agentId) {
          agentRegistry.set(agentId, connectionId ?? socket.connectionId ?? '');
          socket.agentId = agentId;
        }
        // Store optional metadata on socket for future use
        socket.mcpMeta = { role, capabilities };
        return respond({
          result: { status: 'registered', connectionId: socket.connectionId, agentId },
        });
      }

      case 'mcp_forward': {
        const { targetAgentId, targetConnectionId, request } = message.params || {};
        const connectionIdToUse = targetAgentId
          ? agentRegistry.get(targetAgentId)
          : targetConnectionId;
        if (!connectionIdToUse || !request) {
          return respond({ error: { code: -32602, message: 'Missing target or request' } });
        }
        const targetSocket = socketMap.get(connectionIdToUse);
        if (!targetSocket) {
          return respond({ error: { code: -32010, message: 'Target not connected' } });
        }

        // Ensure inner request has an id we can track
        let innerReq = request;
        if (!innerReq.id) {
          innerReq = { ...innerReq, id: Date.now() + Math.random() };
        }

        // Map this id so when the response comes back we can relay to origin using outer message id
        forwardMap.set(innerReq.id, { originSocket: socket, originId: message.id });

        targetSocket.send(JSON.stringify(innerReq));

        return respond({ result: { status: 'forwarded', to: targetAgentId ?? connectionIdToUse } });
      }

      case 'mcp_getResource': {
        const { resourceId } = message.params || {};
        if (!getSupabase())
          return respond({ error: { code: -32050, message: 'Resource DB unavailable' } });
        const { data, error } = await getSupabase()
          .from('resources')
          .select('*')
          .eq('id', resourceId)
          .single();
        if (error) return respond({ error: { code: -32051, message: error.message } });
        return respond({ result: data });
      }

      case 'mcp_listResources': {
        if (!getSupabase())
          return respond({ error: { code: -32050, message: 'Resource DB unavailable' } });
        const { mimeType, uploader } = message.params || {};
        let query = getSupabase().from('resources').select('*');
        if (mimeType) query = query.eq('mime_type', mimeType);
        if (uploader) query = query.eq('uploader', uploader);
        const { data, error } = await query;
        if (error) return respond({ error: { code: -32051, message: error.message } });
        // Attach public URLs
        const enriched = await Promise.all(
          (data || []).map(async (row) => {
            let url = row.path;
            try {
              const { data: pubData } = getSupabase()
                .storage.from('resources')
                .getPublicUrl(row.path);
              if (pubData?.publicUrl) url = pubData.publicUrl;
            } catch {}
            return { ...row, url };
          }),
        );
        return respond({ result: enriched });
      }

      case 'mcp_setStorageCreds': {
        const { url, key } = message.params || {};
        if (!url || !key)
          return respond({ error: { code: -32602, message: 'Missing url or key' } });
        const ok = initSupabase(url, key);
        if (ok) return respond({ result: { status: 'supabase_configured' } });
        return respond({ error: { code: -32052, message: 'Failed to init Supabase' } });
      }
    }
  });

  socket.on('close', () => {
    console.log('Client disconnected');
    if (socket.connectionId) socketMap.delete(socket.connectionId);
    if (socket.agentId) agentRegistry.delete(socket.agentId);
    clearInterval(hbTimer);
  });
});

// Attempt env-based initialization at startup
// script may be imported solely for schema generation. Skip server start in that case.
if (process.env.NO_MCP_SERVER === '1') {
  // noop
} else if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE) {
  initSupabase(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
} else {
  console.log('Supabase not configured - running in local-only mode');
}

if (process.env.NO_MCP_SERVER !== '1') {
  httpServer.listen(PORT, () => {
    console.log(`MCP WebSocket server listening on ws://localhost:${PORT}`);
    console.log(`Serving uploaded files at http://localhost:${PORT}/files/<filename>`);
  });

  // Graceful shutdown on SIGINT / SIGTERM (e.g., Ctrl-C or container stop)
  const shutdown = () => {
    console.log('\nGraceful shutdown initiated');
    // Stop accepting new connections
    wss.close((err) => {
      if (err) console.error('Error closing WebSocketServer', err);
    });
    httpServer.close(() => {
      console.log('HTTP server closed');
    });

    // Close existing client sockets and kill their child processes
    wss.clients.forEach((client) => {
      try {
        if (client.execMap) {
          Object.values(client.execMap).forEach((child) => child.kill('SIGTERM'));
        }
        client.terminate();
      } catch (e) {
        /* noop */
      }
    });

    // Force exit after timeout
    setTimeout(() => {
      console.log('Forcing shutdown');
      process.exit(0);
    }, 3000);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

// After imports, register a simple "echo" tool as example (can be replaced later)
registry.register({
  name: 'echo',
  description: 'Return parameters unchanged — useful for testing',
  handler: async (params) => ({ echo: params }),
});
