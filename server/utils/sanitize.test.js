import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeFilename, sanitizeShellInput } from './sanitize.js';

describe('sanitize utilities', () => {
  it('sanitizeString removes control chars and trims', () => {
    const raw = ' Hello\nworld\r\t ';
    expect(sanitizeString(raw)).toBe('Hello world');
  });

  it('sanitizeFilename strips unsafe chars', () => {
    const raw = 'my?file*name.txt';
    expect(sanitizeFilename(raw)).toBe('my_file_name.txt');
  });

  it('sanitizeFilename truncates very long names', () => {
    const long = 'a'.repeat(150) + '.txt';
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(100);
  });

  it('sanitizeShellInput rejects dangerous chars', () => {
    const dangerous = 'echo hi; rm -rf /';
    expect(() => sanitizeShellInput(dangerous)).toThrow();
  });

  it('sanitizeShellInput passes safe command', () => {
    const safe = 'ls -la';
    expect(sanitizeShellInput(safe)).toBe('ls -la');
  });
});
