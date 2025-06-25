import dotenv from 'dotenv';

// Load variables from .env if present
dotenv.config();

// Application port for HTTP/WebSocket server
export const PORT = process.env.PORT || 8080;

// Default whitelist of shell commands allowed to be executed by the shell_execute tool
const DEFAULT_ALLOWED_CMDS = [
  'ping', 'dir', 'ls', 'pwd', 'whoami', 'date', 'echo', 'ipconfig',
  'id', 'uname', 'cat', 'head', 'tail', 'env', 'who', 'ps',
];

// Allow overriding/augmenting the whitelist via the ALLOWED_CMDS env variable (comma-separated)
export const ALLOWED_CMDS = process.env.ALLOWED_CMDS
  ? process.env.ALLOWED_CMDS.split(',').map((c) => c.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_CMDS;

// JWT secret for authenticating WebSocket connections
export const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Whether to allow unauthenticated connections (useful in dev). Defaults to true in dev, false in production unless explicitly set.
export const AUTH_OPTIONAL = (
  process.env.AUTH_OPTIONAL ?? (process.env.NODE_ENV !== 'production' ? 'true' : 'false')
) === 'true';

// Docker image used for sandboxed shell execution
export const MCP_SHELL_IMAGE = process.env.MCP_SHELL_IMAGE || 'debian:stable-slim'; 