import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

/**
 * Groq documents a 20MB limit per request with an image and gives no separate
 * figure for base64 images. Base64 grows a file by about a third, so 4MB keeps
 * the request well under that limit and the call quick. The site shrinks photos
 * to about 1600px before sending, which lands far below this.
 */
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
/** Smaller than this cannot be a usable photo. */
export const IMAGE_MIN_BYTES = 1024;
/** Shortest side, in pixels, the model can still read something from. */
export const IMAGE_MIN_SIDE = 100;

export const IMAGE_EMPTY = 'Không nhận được ảnh hoặc ảnh bị hỏng. Vui lòng chọn ảnh khác.';
export const IMAGE_INVALID = 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.';
export const IMAGE_TOO_LARGE =
  'Ảnh quá lớn (tối đa 4MB). Vui lòng chọn ảnh nhỏ hơn hoặc tìm bằng từ khóa.';
export const IMAGE_TOO_SMALL =
  'Ảnh quá nhỏ (cần ít nhất 100px mỗi cạnh). Hãy chụp gần và rõ hơn.';

/** The file's real format, read from its first bytes; the declared type is not trusted. */
export type ImageFormat = 'jpeg' | 'png' | 'webp';

const MIME_TYPES: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const ascii = (buffer: Buffer, start: number, end: number) =>
  buffer.toString('latin1', start, end);

export function detectImageFormat(buffer: Buffer): ImageFormat | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP') return 'webp';
  return null;
}

export interface ImageSize {
  width: number;
  height: number;
}

/** JPEG start-of-frame markers carry the size; C4, C8 and CC are other segments. */
const isStartOfFrame = (marker: number) =>
  marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

function jpegSize(buffer: Buffer): ImageSize | null {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    // Fill bytes and markers without a length.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (isStartOfFrame(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webpSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 30) return null;
  const chunk = ascii(buffer, 12, 16);
  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === 'VP8L') {
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | buffer[21]),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  return null;
}

/** Pixel size from the image header, or null when it cannot be read cheaply. */
export function readImageSize(buffer: Buffer, format: ImageFormat): ImageSize | null {
  try {
    if (format === 'png') {
      return buffer.length >= 24
        ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
        : null;
    }
    return format === 'jpeg' ? jpegSize(buffer) : webpSize(buffer);
  } catch {
    // A truncated header: leave the decision to the size checks above.
    return null;
  }
}

export interface ValidImage {
  buffer: Buffer;
  format: ImageFormat;
  /** Taken from the detected format, never from the client. */
  mimeType: string;
}

/**
 * Accepts a photo only when it is a real JPEG, PNG or WebP of a usable size.
 * The file name and type the client sent are ignored, and nothing is written
 * to disk.
 */
export function validateImage(file: { buffer?: Buffer } | undefined): ValidImage {
  const buffer = file?.buffer;
  if (!buffer || buffer.length === 0) throw new BadRequestException(IMAGE_EMPTY);
  if (buffer.length > IMAGE_MAX_BYTES) throw new PayloadTooLargeException(IMAGE_TOO_LARGE);
  if (buffer.length < IMAGE_MIN_BYTES) throw new BadRequestException(IMAGE_EMPTY);

  const format = detectImageFormat(buffer);
  if (!format) throw new BadRequestException(IMAGE_INVALID);

  const size = readImageSize(buffer, format);
  if (size && (size.width < IMAGE_MIN_SIDE || size.height < IMAGE_MIN_SIDE)) {
    throw new BadRequestException(IMAGE_TOO_SMALL);
  }

  return { buffer, format, mimeType: MIME_TYPES[format] };
}
