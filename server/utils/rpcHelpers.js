// rpcHelpers.js – helpers for JSON-RPC 2.0 response objects (without id field)

export const createSuccess = (result) => ({ result });

/**
 * @param {number} code – application-specific or JSON-RPC code (< 0 for errors)
 * @param {string} message – human-readable
 * @param {any} [data] – optional details
 */
export const createError = (code, message, data) => ({
  error: { code, message, ...(data !== undefined ? { data } : {}) },
});
