/**
 * Minimal image headers for tests: real magic bytes and size fields, padded to
 * a plausible file size. Not used by the application.
 */
const pad = (head: Buffer, size: number) => {
  const buffer = Buffer.alloc(Math.max(size, head.length));
  head.copy(buffer);
  return buffer;
};

export function jpegOf(width = 800, height = 600, size = 4_000): Buffer {
  const head = Buffer.alloc(32);
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).copy(head, 0);
  head.write('JFIF\0', 6, 'latin1');
  // Start of frame right after the 16-byte APP0 segment.
  Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08]).copy(head, 20);
  head.writeUInt16BE(height, 25);
  head.writeUInt16BE(width, 27);
  return pad(head, size);
}

export function pngOf(width = 800, height = 600, size = 4_000): Buffer {
  const head = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]).copy(head, 0);
  head.write('IHDR', 12, 'latin1');
  head.writeUInt32BE(width, 16);
  head.writeUInt32BE(height, 20);
  return pad(head, size);
}

export function webpOf(width = 800, height = 600, size = 4_000): Buffer {
  const head = Buffer.alloc(30);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(size - 8, 4);
  head.write('WEBPVP8X', 8, 'latin1');
  head.writeUInt32LE(10, 16);
  head.writeUIntLE(width - 1, 24, 3);
  head.writeUIntLE(height - 1, 27, 3);
  return pad(head, size);
}

export function lossyWebpOf(width = 800, height = 600, size = 4_000): Buffer {
  const head = Buffer.alloc(30);
  head.write('RIFF', 0, 'latin1');
  head.write('WEBPVP8 ', 8, 'latin1');
  Buffer.from([0x9d, 0x01, 0x2a]).copy(head, 23);
  head.writeUInt16LE(width, 26);
  head.writeUInt16LE(height, 28);
  return pad(head, size);
}

export const textOf = (text: string, size = 4_000) => pad(Buffer.from(text, 'utf8'), size);
