import { describe, it, expect } from 'vitest';
import { ToolRegistry } from './ToolRegistry.js';
import { z } from 'zod';

describe('ToolRegistry', () => {
  it('registers and lists tools', () => {
    const reg = new ToolRegistry();
    reg.register({ name: 'testTool', description: 'desc', handler: () => 'ok' });
    const list = reg.list();
    expect(list.find((t) => t.name === 'testTool')).toBeTruthy();
  });

  it('invokes handler and returns result', async () => {
    const reg = new ToolRegistry();
    reg.register({ name: 'adder', description: 'add', inputSchema: z.object({ a: z.number(), b: z.number() }), handler: ({ a, b }) => a + b });
    const res = await reg.invoke('adder', { a: 2, b: 3 });
    expect(res).toEqual({ result: 5 });
  });

  it('returns error for invalid params', async () => {
    const reg = new ToolRegistry();
    reg.register({ name: 'strict', description: 'strict', inputSchema: z.object({ a: z.string() }), handler: () => 'never' });
    const res = await reg.invoke('strict', { a: 123 });
    expect(res.error).toBeTruthy();
    expect(res.error.code).toBe(-32602);
  });
}); 