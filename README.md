# Slash / MCP – Full-Stack MVP

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

---

## 🗺️ Roadmap (next milestones)

1. Persist & serve uploaded resources.
2. Real-time stdout stream via incremental JSON-RPC notifications.
3. Command sandboxing or containerisation for safe demos.
4. Docker & docker-compose for one-shot deployment.
5. Optional auth (API key / JWT).
6. LLM integration proof-of-concept (`mcp_invokeTool → llm_chat`).

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