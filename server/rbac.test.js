import { describe, it, expect } from 'vitest';

// Ensure AUTH_OPTIONAL is set to default test-friendly value (true in dev)
// If you want to assert guest restrictions, make AUTH_OPTIONAL=false before importing index.js.

process.env.NO_MCP_SERVER = '1';

const { roleAllows } = await import('./index.js');

describe('RBAC roleAllows', () => {
  it('developer has global shell_execute access', () => {
    expect(roleAllows('developer', 'shell_execute')).toBe(true);
  });

  it('developer can perform supabase select', () => {
    expect(roleAllows('developer', 'supabase_mcp_tool', 'select')).toBe(true);
  });

  it('developer cannot perform unknown supabase op', () => {
    expect(roleAllows('developer', 'supabase_mcp_tool', 'grant')).toBe(false);
  });

  it('guest defaults to allowed when AUTH_OPTIONAL is true', () => {
    expect(roleAllows('guest', 'openai_chat')).toBe(true);
  });
});
