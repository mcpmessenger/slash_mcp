# Contributing Guidelines

Thank you for helping improve Slash / MCP!

## Workflow

1. **Create a Branch** – Use `git checkout -b <feature|fix>/<short-desc>`.
2. **Keep PRs Small** – Aim for ≤ ~400 lines changed.
3. **Run Checks** – `npm ci && npm run format:check && npm run lint && npm test` before pushing.
4. **Write Tests** – Cover new logic with unit tests or integration tests.
5. **Conventional Commits** – e.g. `feat(terminal): stream stdout chunks`.
6. **Link Issues** – Reference the GitHub issue in the PR description (`Closes #12`).

## Code Style

The repo uses ESLint and Prettier. Auto-format code with:

```bash
npm run format
```

## Directory Tips

* `src/` – Front-end React code.
* `server/` – Node WebSocket backend and tool integrations.
* `docs/` – Architectural and sprint documentation.

Feel free to open an issue first if you're unsure whether your idea fits the roadmap. 