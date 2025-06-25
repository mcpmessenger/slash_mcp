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

*Continue appending notes here with each significant action or decision.* 