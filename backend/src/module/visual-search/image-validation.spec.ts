import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  IMAGE_EMPTY,
  IMAGE_INVALID,
  IMAGE_MAX_BYTES,
  IMAGE_TOO_LARGE,
  IMAGE_TOO_SMALL,
  detectImageFormat,
  readImageSize,
  validateImage,
} from './image-validation.js';
import { jpegOf, lossyWebpOf, pngOf, textOf, webpOf } from '../../../test/test-images.js';

const statusOf = (run: () => unknown) => {
  try {
    run();
    return null;
  } catch (error) {
    return error as HttpException;
  }
};

describe('detectImageFormat and readImageSize', () => {
  it.each([
    ['jpeg', jpegOf(640, 480)],
    ['png', pngOf(640, 480)],
    ['webp', webpOf(640, 480)],
    ['webp', lossyWebpOf(640, 480)],
  ] as const)('recognises %s by its first bytes and reads its size', (format, buffer) => {
    expect(detectImageFormat(buffer)).toBe(format);
    expect(readImageSize(buffer, format)).toEqual({ width: 640, height: 480 });
  });

  it.each([
    ['GIF', textOf('GIF89a')],
    ['SVG', textOf('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ['PDF', textOf('%PDF-1.7')],
    ['HEIC', (() => { const b = textOf(''); b.write('ftypheic', 4, 'latin1'); return b; })()],
    ['RIFF that is not WebP', textOf('RIFF\0\0\0\0WAVE')],
  ])('does not accept %s', (_label, buffer) => {
    expect(detectImageFormat(buffer)).toBeNull();
  });
});

describe('validateImage', () => {
  it.each([
    ['image/jpeg', jpegOf()],
    ['image/png', pngOf()],
    ['image/webp', webpOf()],
  ])('accepts a real image and reports %s from its content', (mimeType, buffer) => {
    expect(validateImage({ buffer }).mimeType).toBe(mimeType);
  });

  it('ignores the name and type the client claims', () => {
    const valid = validateImage({ buffer: pngOf(), mimetype: 'image/jpeg', originalname: 'x.jpg' } as never);
    expect(valid).toMatchObject({ format: 'png', mimeType: 'image/png' });
  });

  it.each([
    ['no file', undefined, 400, IMAGE_EMPTY],
    ['an empty file', { buffer: Buffer.alloc(0) }, 400, IMAGE_EMPTY],
    ['a file under 1KB', { buffer: jpegOf(800, 600, 500) }, 400, IMAGE_EMPTY],
    ['a text file renamed to .jpg', { buffer: textOf('hello, I am not a photo'), originalname: 'a.jpg', mimetype: 'image/jpeg' }, 400, IMAGE_INVALID],
    ['a GIF', { buffer: textOf('GIF89a') }, 400, IMAGE_INVALID],
    ['an SVG', { buffer: textOf('<svg></svg>') }, 400, IMAGE_INVALID],
    ['a PDF', { buffer: textOf('%PDF-1.4') }, 400, IMAGE_INVALID],
    ['a tiny 50x50 image', { buffer: pngOf(50, 50) }, 400, IMAGE_TOO_SMALL],
    ['a file over the limit', { buffer: jpegOf(800, 600, IMAGE_MAX_BYTES + 1) }, 413, IMAGE_TOO_LARGE],
  ])('refuses %s', (_label, file, status, message) => {
    const error = statusOf(() => validateImage(file as never));
    expect(error?.getStatus()).toBe(status);
    expect(error?.message).toBe(message);
  });

  it('still accepts a JPEG whose size header cannot be found', () => {
    const buffer = Buffer.alloc(4_000);
    Buffer.from([0xff, 0xd8, 0xff, 0xdb]).copy(buffer);
    expect(validateImage({ buffer }).format).toBe('jpeg');
  });
});
