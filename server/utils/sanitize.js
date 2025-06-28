// Basic sanitization helpers
// Replace CR/LF to avoid log injection, trim, etc.
export function sanitizeString(str = '') {
  if (typeof str !== 'string') return '';
  return str.replace(/[\r\n\t]+/g, ' ').trim();
}

// Keep only safe characters for filenames (alnum, dash, underscore, dot)
export function sanitizeFilename(name = '') {
  return sanitizeString(name)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .substring(0, 100);
}

// Very simple shell input sanitizer – rejects commands containing characters that are
// commonly used for command chaining or redirection. This is **not** a replacement
// for proper sandboxing; it just blocks obvious injection attempts before they hit
// the whitelist & Docker isolation layers.
// Throws if forbidden chars are found, otherwise returns trimmed command.
export function sanitizeShellInput(cmd = '') {
  const cleaned = sanitizeString(cmd);
  // Characters / patterns disallowed: ; | & > < ` $ (backticks, subshell)
  // Newlines already stripped by sanitizeString.
  const forbidRe = /[;&|><`$]/;
  if (forbidRe.test(cleaned)) {
    throw new Error('Shell command contains potentially dangerous characters');
  }
  return cleaned;
}
