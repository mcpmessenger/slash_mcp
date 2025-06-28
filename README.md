# Slash / MCP – **MVP v1 (2025-06-27)** 🎉

> Feature-complete: real-time streaming, Supabase persistence, dual-terminal forwarding, global toast notifications, first-run walkthrough.
>
> `main` ← merge candidate branch: **v1-mvp** (`f2b11cf`)

A single-repo prototype implementing the **Model Context Protocol (MCP)**.  
The goal is to explore how a browser client, an AI-assistant workflow and a thin backend can cooperate through a JSON-RPC 2.0 WebSocket.

This repo now contains **both the React frontend and a minimal Node/WebSocket backend** so you can clone, install and run everything with two commands.

---

## ✨ What's inside

| Layer     | Tech                                       | Highlights                                                                             |
| --------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Frontend  | React 18 + Vite + Tailwind + Framer-Motion | Animated dark/light UI, Terminal modal, Multi-Client manager, resource sidebar         |
| Transport | JSON-RPC 2.0 over WebSocket                | `src/lib/MCPWebSocketClient.ts` (client) ↔ `server/index.js` (server)                 |
| Backend   | Node 18 + `ws`                             | Handles `mcp_sendResource`, `mcp_invokeTool` (`shell_execute`) & `mcp_getCapabilities` |

---

## 🔧 Installation (local dev)

```bash
# 1. clone and install dependencies
npm install

# 2. copy environment file (fill in API keys later)
cp env.example .env

# 3. start the complete local stack (MCP proxy + backend + Vite)
npm run dev:all   # → http://localhost:5173
```

_The `dev:all` script runs the Claude MCP proxy, the Node backend (`ws://localhost:3000` by default) **and** the Vite dev server concurrently so you can develop everything with a single command._

Open http://localhost:5173 in your browser, click the **Users** icon, add `ws://localhost:8080` and **Connect**.  
You now have a live shell in the UI (`Terminal` icon) plus sidebar capability data.

---

## 🏃‍♂️ Day-to-day scripts

| Command           | Purpose                                   |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Vite + React Hot Reload                   |
| `npm run dev:all` | **One-shot** – MCP proxy + backend + Vite |
| `npm run backend` | Start Node WebSocket server               |
| `npm run lint`    | ESLint full repo                          |
| `npm run test`    | Vitest unit tests                         |
| `npm run smoke`   | Build + headless Chrome smoke test        |
| `npm run build`   | Production build to `dist/`               |

---

## 🛠️ Current capabilities

- **Terminal-to-server shell** – run any command (5 s timeout). Output streams back to the modal, with history (↑/↓) and live _running…_ indicator.
- **Capability handshake** – client requests `mcp_getCapabilities` after connect; sidebar counts populate automatically.
- **Resource upload (mock)** – text / binary upload flows exist; server echoes receipt. Persisted storage coming soon.
- **Pluggable Tool Registry** – backend auto-discovers registered tools.
- **OpenAI & Zapier integrations** – invoke with
  ```
  tool openai_tool {"prompt":"Hello"}
  tool zapier_trigger_zap {"payload":{"run":true}}
  ```

---

## 🗺️ Roadmap (next milestones)

1. Persist & serve uploaded resources.
2. Real-time stdout stream via incremental JSON-RPC notifications.
3. Command sandboxing or containerisation for safe demos.
4. Docker & docker-compose for one-shot deployment.
5. Optional auth (API key / JWT).
6. LLM integration proof-of-concept (`mcp_invokeTool → llm_chat`).
7. OpenAI/Zapier done, next Supabase Tool.

---

## 🤝 Contributing

PRs are welcome! Feel free to open issues for bugs or suggestions.  
When contributing, please:

1. `npm run lint && npm run test` before pushing.
2. Follow the coding style enforced by ESLint + Prettier (coming soon).

---

© 2025 Manus AI – built by **automationalien.com**

## ⚠️ Command whitelist

The backend executes only a small set of safe commands by default:
`ping`, `dir`, `ls`, `pwd`, `whoami`, `date`, `echo`, `ipconfig`.

The Terminal auto-completes these and the server will reject everything else (`Command not allowed`).  
`ping` count flag is automatically converted (`-c` ↔ `-n`) depending on the OS.

## Shell sandbox defaults (dev)

The backend exposes a `shell_execute` tool that is **whitelisted** for safety. By default (and in CI) it uses a minimal container image, but if Docker is not available it falls back to the host shell.

Allowed commands as of 2025-06-25:

```
ping dir ls pwd whoami date echo ipconfig
id uname cat head tail env who ps
```

If you need more, add them to `ALLOWED_CMDS` in `server/index.js`.

Add or override via the env-var:

```bash
# allow extra cmds (comma-separated)
ALLOWED_CMDS="uname,id,who" npm run backend

# or disable the whitelist entirely while developing
ALLOWED_CMDS=ALL npm run backend
```

The server reloads the list on startup, so make sure to restart after changing it.

> Tip: set `MCP_SHELL_IMAGE` to change the container (e.g. `debian:stable-slim`).

## New Features (2025-06-25)

1. Automatic Dual Connections
   The client now auto-connects to `ws://localhost:8080` until **two** live connections are available. You land directly in the dual-terminal view.

2. Persistent Command Template
   Each terminal input starts with

   ```
   @{connection} {resources},{tools},{prompts}
   ```

   • Drag a connection/tool/resource/prompt from the sidebar to replace its placeholder.

3. Drag-and-Drop Uploads
   • Drag any file onto the Resources panel (or use **Add Resource**) to upload.
   • Images render previews; all uploads become draggable resources.
   • If Supabase creds are set (Settings → Supabase), uploads are stored in your bucket.

4. Collapsible Sidebar & Resizable Terminals
   • Sidebar is collapsed by default—click the ❯ rail to show/hide.
   • Terminals split 50/50; drag the divider to resize.

## Quick Start

```bash
npm install
cp env.example .env   # edit credentials if needed
npm run dev:all       # full stack, browser at http://localhost:5173
```

Visit http://localhost:5173 – the app auto-connects to the local backend; two terminals appear side-by-side and the sidebar is collapsed by default (tap the rail to expand).

## 2025-06-25 Upgrades

- Centralised server config (`server/config.js`) – secrets & whitelist via env vars (see `env.example`).
- Graceful shutdown & `/healthz` route for ops.
- Dynamic drag-and-drop prompt library:
  - Sidebar → Prompts panel supports Add, Drag, Delete.
  - Prompts persist in `localStorage`.
- Cross-connection forwarding reworked – streamed stdout (`mcp_streamOutput`) now relays back to the origin so `@2 ping 8.8.8.8` works between browser windows.
- Starter prompts `test` and `describe this image` included from backend capabilities.

## Using Claude Code as an MCP server

> Updated 2025-06-27 – works with the Python **mcp-proxy ≥ 0.8** release, which truly supports stateless Streamable-HTTP. The Node 5.x proxy and the older `run_command` examples will NOT work.

1. Install Claude CLI inside WSL (or any Linux VM).

   ```bash
   # download the binary, then
   sudo mv ~/Downloads/claude /usr/local/bin/claude && chmod +x /usr/local/bin/claude
   claude --version  # sanity-check
   ```

2. Install the Python proxy once (isolated via `pipx`).

   ```bash
   sudo apt install -y pipx
   pipx install "mcp-proxy>=0.8,<1"
   ```

   This puts the `mcp-proxy` CLI at `~/.local/bin/mcp-proxy` (already on PATH after `pipx ensurepath`).

3. Run the bridge in **stateless Streamable-HTTP** mode on port 8081.

   ```bash
   export ANTHROPIC_API_KEY=<your-key>

   mcp-proxy \
     --stateless \
     --transport streamablehttp \
     --host 0.0.0.0 \
     --port 8081 \
     -- \
     claude mcp serve
   # console →  starting server on port 8081
   ```

4. Tell the Slash backend where to find it (note the trailing slash `/`).

   ```bash
   # Windows PowerShell or .env
   CLAUDE_MCP_URL=http://localhost:8081/mcp/
   ANTHROPIC_API_KEY=<your-key>
   npm run backend
   ```

5. Invoke Claude tools from the browser terminal:
   ```text
   tool claude_mcp_invoke {"tool":"Bash","params":{"command":"echo hello","apiKey":"<your-key>"}}
   ```
   Expect the string `hello` streamed back into the terminal pane.

Troubleshooting tips (full guide in **docs/claude-mcp-troubleshooting.md**):

- 404 "Session not found" → ensure you are running the **Python** proxy with `--stateless` **and** using the trailing `/mcp/` URL.
- 406 "Not Acceptable" → include both MIME types in the `Accept` header (`application/json, text/event-stream`).
- ECONNREFUSED from Windows → add `--host 0.0.0.0` and use the WSL IP instead of `localhost` (e.g. `172.xx.xx.xx`).
