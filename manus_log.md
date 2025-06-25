## Manus Project Log

### 2025-06-24 14:35
- Completed full-stack MVP: live WebSocket backend, resource persistence, command streaming & abort.
- Added UI improvements (terminal history, running indicator, allowed command autocomplete).
- Dockerfile and docker-compose prepared for containerised deployment.

### 2025-06-24 Forwarding & Claude Integration
- Added @anthropic-ai/sdk and Claude streaming adapter.
- Implemented `mcp_register` and `mcp_forward` on backend for cross-connection forwarding.
- Server keeps maps for sockets and forward tracking.
- Frontend now registers each connection ID and supports `forwardRequest` helper.
- Terminal accepts `@<handle> command` to run commands on another connection via MCP.
- Duplicate connection names are suffixed with `#n`.
- Manus smoke test still passes.

### 2025-06-24 Gemini & Model Selector
- Integrated `@google/generative-ai` and added `gemini_chat` adapter.
- Settings modal now stores Gemini API key.
- Frontend helpers `invokeGemini`, and `gemini` verb.
- Per-terminal dropdown lets users pick default mode: shell, GPT, Claude, Gemini.
- Verbs still override; `@<pane> gemini "prompt"` forwards to other terminals.
- Autocomplete list updated.

### 2025-06-25 GUI Pivot & Dual-Pane Terminals
- Settings is now the default landing route; gear icon replaced with Home on that page.
- API-key management moved from modal into Settings (OpenAI, Anthropic, Gemini).  Keys persist to `localStorage`.
- Added `DoublePane` layout composed of reusable `TerminalPane` components.
- Removed legacy single-terminal / clients / metrics icons from header.
- Dark-mode readability improved (higher contrast backgrounds/text).
- TerminalPane enhancements:
  - Local whitelist fallback (`ls, pwd, echo, date, whoami, help, clear`).
  - Autosuggest list combines whitelist & connection handles.
  - Forwarding (`@<handle> command`) now mirrors a summary line in the target pane via global `mcp_mirror` event for clearer UX.
- Sidebar "+ Add Connection" prompts for URL and calls `connect()`.
- `Header` now uses `react-router-dom`'s `useLocation`.
- Smoke test pending after refactor.

Suggested Next Steps
- Persist per-pane scrollback to `localStorage` so reloading keeps history.
- Real streamOutput hook to update mirrored entries with live output and success/error.
- Toggle between one-pane and two-pane layouts at runtime.
- Make whitelist editable in Settings.
- Expand smoke test to cover dual-pane interactions and Settings navigation.

### 2025-06-25
- Phase-1 agent registry and enhanced `mcp_forward` completed.
- Added RBAC with optional JWT auth (guest/developer/admin/ai_agent roles).
- Sandboxed `shell_execute` via Docker when available.
- Integrated dynamic Supabase storage: `mcp_setStorageCreds`, `mcp_listResource`, `mcp_getResource`.
- Front-end Settings panel now lets users paste Supabase URL + service role key.
- Implemented Resource drawer in sidebar (lists, previews, uploads).
- Dark-mode form/label contrast tweak.
- Pipeline: cleaned Vite build, resilient Puppeteer smoke test (build/serve/connect flow).

### 2025-06-25 UI/UX overhaul
- Added drag-and-drop workflow placeholders in terminal inputs
- Implemented automatic connection to two local MCP servers on load
- Sidebar is collapsed by default with arrow control; hamburger removed
- Dual terminals now resizable via draggable divider; default 50/50 split
- Resource panel supports file/image upload; images preview; Supabase upload when creds present
- Settings page cleaned (removed Quick Actions, Theme, Connection count); added resource/tool counts and Supabase refresh
- Smoke test passes

* Implemented env-driven server configuration + `env.example`.
* Added graceful shutdown & health-check.
* Sidebar prompts can be added/removed, persisted locally, and dragged to Terminal.
* Forwarding logic now streams shell output back to origin window.

*Continue appending notes here with each significant action or decision.*

### 2025-06-25 Tool Registry + First Integrations
- Introduced **ToolRegistry** on the backend – pluggable architecture for all future MCP tools.
- Migrated `mcp_invokeTool` to delegate to the registry when a matching tool is found.
- Added **Zapier** (`zapier_trigger_zap`) and **OpenAI** (`openai_tool`) adapters, both registered at server start.
- Role-based access lists extended to include new tools for `developer`, `admin`, and `ai_agent` roles.
- Front-end:
  - New `tool <name> <json>` shortcut in both `Terminal` and `TerminalPane` so any registry tool can be invoked from the UI.
  - Settings page now persists OpenAI, Anthropic, Gemini, **Zapier Webhook URL**, and Supabase URL/Service-Role Key to `localStorage`.
  - Supabase creds are pushed to backend via `mcp_setStorageCreds`, after which uploads go directly to the bucket.
- Smoke tests and unit tests (`ToolRegistry.test.js`) pass.
- Manual validation: `tool openai_tool {"prompt":"hi"}` returns completion; `tool zapier_trigger_zap {"payload":{"hello":"world"}}` returns `status: triggered, httpStatus: 200`. 