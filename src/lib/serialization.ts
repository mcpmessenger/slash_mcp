import { MCPResource } from '../types/mcp';

/**
 * Serializes an MCPResource into a plain JSON object that can be sent over the wire.
 * If the resource contains binary data, attempt to base64-encode ArrayBuffer.
 */
export function serializeResource(resource: MCPResource): any {
  const { data, ...rest } = resource;

  if (data instanceof ArrayBuffer) {
    const base64 = bufferToBase64(data);
    return { ...rest, data: { type: 'base64', value: base64 } };
  }

  if (typeof data === 'string' || data === undefined) {
    return { ...rest, data };
  }

  throw new Error('Unsupported data type for serialization');
}

/**
 * Parses a serialized resource back into MCPResource, converting base64 to ArrayBuffer when needed.
 */
export function parseResource(serialized: any): MCPResource {
  const { data, ...rest } = serialized;

  if (data && typeof data === 'object' && data.type === 'base64') {
    return { ...rest, data: base64ToBuffer(data.value) } as MCPResource;
  }

  return { ...serialized } as MCPResource;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
