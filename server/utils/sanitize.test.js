import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeFilename } from './sanitize.js';

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
}); 