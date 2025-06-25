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

*Continue appending notes here with each significant action or decision.* 