# Claude MCP Bridge – Troubleshooting Guide

This page lists the most common issues encountered while running the Claude Code → MCP HTTP bridge with `mcp-proxy` and explains how to fix them.

---

## 1. "HTTP 404 – Session not found"

**Cause**  `mcp-proxy` is in *state-ful* mode and will only accept requests that include a valid `mcp-session-id`. The stock build of the bridge does *not* return a session-id from the `initialize` method, so every subsequent call fails.

### Fix (recommended)

Run the proxy in **stateless** mode so session-ids are ignored:

```bash
# kill any old proxy first
pkill -f mcp-proxy 2>/dev/null              # WSL/Linux

# start fresh – note the exact flag order
npx --yes mcp-proxy \
  --stateless \
  --server stream \
  --port 8081 \
  "$(which claude)" mcp serve
```

Make sure you see **only one line** of output:

```
starting server on port 8081
```

If another line appears (or port 8081 is busy) an old copy is still running. Kill it and start again.

### Alternative fix (advanced)

Keep `--stateful` and supply your own session-id header in every request:

```bash
uuid=$(uuidgen)                             # or any non-empty value
curl -X POST http://localhost:8081/mcp \ 
  -H "Content-Type: application/json" \ 
  -H "x-api-key: $ANTHROPIC_API_KEY" \ 
  -H "anthropic-version: 2023-06-01" \ 
  -H "mcp-session-id: $uuid" \ 
  -d '{"jsonrpc":"2.0","id":1,"method":"mcp_invokeTool","params":{"toolName":"run_command","parameters":{"command":"echo hi"}}}'
```

---

## 2. "Command not found: export" in PowerShell

`export` is a Bash command. In **PowerShell** use the `$Env:` prefix instead:

```powershell
$Env:ANTHROPIC_API_KEY = "sk-ant-..."
$Env:CLAUDE_MCP_URL    = "http://localhost:8081/mcp"
```

Or use the shell-agnostic one-liner with `cross-env`:

```powershell
npx cross-env ANTHROPIC_API_KEY=sk-ant-... CLAUDE_MCP_URL=http://localhost:8081/mcp node scripts/claudeSmoke.js
```

---

## 3. Validating the bridge (smoke test)

Run the automated check from the project root:

```bash
node scripts/claudeSmoke.js
```

Expected output:

```
YYYY-MM-DDTHH:MM:SSZ  HTTP 200  {"jsonrpc":"2.0","result":{"stdout":"hi\n","exitCode":0}}
Claude MCP smoke test passed ✅
```

Any other status causes the script to exit with code 1 and print a helpful error message to the console.

---

## 4. Port already in use

`mcp-proxy` exits silently if the port is occupied. Find and kill the stray process:

```bash
sudo lsof -i :8081          # macOS/Linux
netstat -tulpn | grep 8081  # WSL
pkill -f mcp-proxy          # then restart
```

---

## 5. Flags cheat-sheet

| Mode | Command |
|------|---------|
| Stateless (recommended) | `npx --yes mcp-proxy --stateless --server stream --port 8081 "$(which claude)" mcp serve` |
| Stateful | `npx --yes mcp-proxy --stateful   --server stream --port 8081 "$(which claude)" mcp serve` |

---

### See also

* `scripts/claudeSmoke.js` – automated integration test (writes to `debug-log.txt`).
* `env.example` – shows default `CLAUDE_MCP_URL` and other useful env-vars.
* `README.md` – full project overview. 