# Slash / MCP – **MVP v1 (2025-06-27)** 🎉

> Feature-complete: real-time streaming, Supabase persistence, dual-terminal forwarding, global toast notifications, first-run walkthrough.
>
> `main` ← merge candidate branch: **v1-mvp**  (`f2b11cf`)

A single-repo prototype implementing the **Model Context Protocol (MCP)**.  
The goal is to explore how a browser client, an AI-assistant workflow and a thin backend can cooperate through a JSON-RPC 2.0 WebSocket.

This repo now contains **both the React frontend and a minimal Node/WebSocket backend** so you can clone, install and run everything with two commands.

---

## ✨ What's inside

| Layer | Tech | Highlights |
|-------|------|------------|
| Frontend | React 18 + Vite + Tailwind + Framer-Motion | Animated dark/light UI, Terminal modal, Multi-Client manager, resource sidebar |
| Transport | JSON-RPC 2.0 over WebSocket | `src/lib/MCPWebSocketClient.ts` (client) ↔ `server/index.js` (server) |
| Backend | Node 18 + `ws` | Handles `mcp_sendResource`, `mcp_invokeTool` (`shell_execute`) & `mcp_getCapabilities` |

---

## 🔧 Installation (local dev)

```bash
# 1. clone and install
npm install

# 2. start backend (WebSocket on ws://localhost:8080)
npm run backend

# 3. _in another terminal_ start the Vite dev server
npm run dev   # → http://localhost:5173
```

Open http://localhost:5173 in your browser, click the **Users** icon, add `ws://localhost:8080` and **Connect**.  
You now have a live shell in the UI (`Terminal` icon) plus sidebar capability data.

---

## 🏃‍♂️ Day-to-day scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite + React Hot Reload |
| `npm run backend` | Start Node WebSocket server |
| `npm run lint` | ESLint full repo |
| `npm run test` | Vitest unit tests |
| `npm run smoke` | Build + headless Chrome smoke test |
| `npm run build` | Production build to `dist/` |

---

## 🛠️ Current capabilities

* **Terminal-to-server shell** – run any command (5 s timeout). Output streams back to the modal, with history (↑/↓) and live *running…* indicator.
* **Capability handshake** – client requests `mcp_getCapabilities` after connect; sidebar counts populate automatically.
* **Resource upload (mock)** – text / binary upload flows exist; server echoes receipt. Persisted storage coming soon.
* **Pluggable Tool Registry** – backend auto-discovers registered tools.
* **OpenAI & Zapier integrations** – invoke with
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

PRs are welcome!  Feel free to open issues for bugs or suggestions.  
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

The backend exposes a `shell_execute` tool that is **whitelisted** for safety.  By default (and in CI) it uses a minimal container image, but if Docker is not available it falls back to the host shell.

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
npm run backend   # starts MCP server at ws://localhost:8080
npm run dev       # starts Vite dev
```
Visit http://localhost:5173/chat – two terminals will appear; sidebar is hidden but accessible. 

## 2025-06-25 Upgrades

* Centralised server config (`server/config.js`) – secrets & whitelist via env vars (see `env.example`).
* Graceful shutdown & `/healthz` route for ops.
* Dynamic drag-and-drop prompt library:
  * Sidebar → Prompts panel supports Add, Drag, Delete.
  * Prompts persist in `localStorage`.
* Cross-connection forwarding reworked – streamed stdout (`mcp_streamOutput`) now relays back to the origin so `@2 ping 8.8.8.8` works between browser windows.
* Starter prompts `test` and `describe this image` included from backend capabilities.

## Using Claude Code as an MCP server

1. In WSL (Linux) install Claude CLI and start the bridge:

```bash
export CLAUDE_BIN=/usr/bin/claude
export ANTHROPIC_API_KEY=<your-key>
# stateless HTTP bridge on :8081
npx --yes mcp-proxy --stateless --server stream --port 8081 /usr/bin/claude mcp serve
```

2. Set the env-var before starting the backend (or via Settings panel):

```bash
export CLAUDE_MCP_URL="http://localhost:8081/mcp"
npm run backend
```

3. In the Slash terminal invoke tools:

```text
tool claude_mcp_invoke {"tool":"run_command","params":{"command":"echo hello"}}
```

Outputs from Claude CLI stream back into the pane.

> Having trouble? See **docs/claude-mcp-troubleshooting.md** for common errors (e.g. "Session not found") and step-by-step fixes.