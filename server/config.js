import dotenv from 'dotenv';

// Load variables from .env if present
dotenv.config();

console.log('DEBUG OPENAI', !!process.env.OPENAI_API_KEY);
console.log('DEBUG ZAP', process.env.ZAPIER_WEBHOOK_URL);

// Application port for HTTP/WebSocket server
export const PORT = process.env.PORT || 8080;

// Minimal default allow list – extended via env ALLOWED_CMDS if needed
const DEFAULT_ALLOWED_CMDS = ['echo', 'cat', 'ls', 'pwd'];

let extra = [];
let ALLOW_ALL_COMMANDS = false;

if (process.env.ALLOWED_CMDS) {
  const raw = process.env.ALLOWED_CMDS.trim();
  if (raw.toUpperCase() === 'ALL' || raw === '*') {
    ALLOW_ALL_COMMANDS = true;
  } else {
    extra = raw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }
}

const ALLOWED_CMDS = [...new Set([...DEFAULT_ALLOWED_CMDS, ...extra])];

export { ALLOW_ALL_COMMANDS, ALLOWED_CMDS };

// JWT secret for authenticating WebSocket connections
export const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Whether to allow unauthenticated connections (useful in dev). Defaults to true in dev, false in production unless explicitly set.
export const AUTH_OPTIONAL =
  (process.env.AUTH_OPTIONAL ?? (process.env.NODE_ENV !== 'production' ? 'true' : 'false')) ===
  'true';

// Docker image used for sandboxed shell execution
export const MCP_SHELL_IMAGE = process.env.MCP_SHELL_IMAGE || 'debian:stable-slim';

// Comma-separated list of static API keys that are allowed to connect when JWT is absent.
// Example: API_KEYS="dev123,staging456"
export const VALID_API_KEYS = (process.env.API_KEYS || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);
