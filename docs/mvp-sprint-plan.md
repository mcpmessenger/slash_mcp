# MVP Sprint Plan

_Revision: 2025-06-26_

---

## Sprint 1 – Core Connectivity & Command Path

| Task                                              | Owner    | Issue | Notes |
| ------------------------------------------------- | -------- | ----- | ----- |
| Harden WebSocket server (heartbeat, reconnect)    | backend  | #tbd  |       |
| React `useConnection` hook & status badges        | frontend | #tbd  |       |
| Centralise `shell_execute` whitelist & validation | backend  | #tbd  |       |
| Terminal error UI                                 | frontend | #tbd  |       |

**Definition-of-Done**: reconnect works, disallowed commands show friendly error, tests pass.

## Sprint 2 – Real-time Output Streaming

| Task                                     | Owner    | Issue | Notes |
| ---------------------------------------- | -------- | ----- | ----- |
| Stream stdout/stderr chunks via JSON-RPC | backend  | #tbd  |       |
| Append chunks in `Terminal.tsx`          | frontend | #tbd  |       |
| Load-test long-running commands          | QA       | #tbd  |       |

## Sprint 3 – Resource Persistence (Supabase)

| Task                               | Owner    | Issue | Notes |
| ---------------------------------- | -------- | ----- | ----- |
| Create Supabase project & RLS      | infra    | #tbd  |       |
| Implement `mcp_*Resource` handlers | backend  | #tbd  |       |
| Replace mock uploads in UI         | frontend | #tbd  |       |

## Sprint 4 – UX / Onboarding Polish

| Task                                 | Owner    | Issue | Notes |
| ------------------------------------ | -------- | ----- | ----- |
| In-app walkthrough (`react-joyride`) | frontend | #tbd  |       |
| Global toast notifications           | frontend | #tbd  |       |
| Responsive & theme extras            | design   | #tbd  |       |
| README & deploy updates              | docs     | #tbd  |       |

---

_Stretch_: Basic LLM chat tool, RBAC tests, Supabase auth.

This document will be updated at the end of every sprint.
