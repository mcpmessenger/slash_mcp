// @ts-nocheck

import { describe, it, expect } from 'vitest';
import { serializeResource, parseResource } from './serialization';

const textResource = {
  uri: 'file:///example.txt',
  name: 'Example',
  mimeType: 'text/plain',
  data: 'Hello world',
};

describe('serialization helpers', () => {
  it('roundtrips string data', () => {
    const serialized = serializeResource(textResource);
    const parsed = parseResource(serialized);
    expect(parsed).toEqual(textResource);
  });

  it('roundtrips binary data', () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const binResource = { ...textResource, data: buffer };
    const serialized = serializeResource(binResource);
    const parsed = parseResource(serialized);
    expect(parsed.data).instanceOf(ArrayBuffer);
    expect(new Uint8Array(parsed.data as ArrayBuffer)).toEqual(new Uint8Array(buffer));
  });
}); 