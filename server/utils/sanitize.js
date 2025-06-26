// Basic sanitization helpers
// Replace CR/LF to avoid log injection, trim, etc.
export function sanitizeString(str = '') {
  if (typeof str !== 'string') return '';
  return str.replace(/[\r\n\t]+/g, ' ').trim();
}

// Keep only safe characters for filenames (alnum, dash, underscore, dot)
export function sanitizeFilename(name = '') {
  return sanitizeString(name).replace(/[^a-zA-Z0-9._-]+/g, '_').substring(0, 100);
} 