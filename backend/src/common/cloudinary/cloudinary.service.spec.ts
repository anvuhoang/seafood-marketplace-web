import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import {
  CLOUDINARY_ALLOWED_FORMATS,
  CLOUDINARY_IMAGE_MAX_BYTES,
  CloudinaryService,
  signCloudinaryParams,
} from './cloudinary.service.js';

const SETTINGS = { cloudName: 'demo-cloud', apiKey: 'key', apiSecret: 'secret' };
const FOLDER = 'haisan-express/vendors/vendor-1';
const IMAGE = `https://res.cloudinary.com/demo-cloud/image/upload/v1730000000/${FOLDER}/logo_1.png`;

describe('CloudinaryService', () => {
  let settings: typeof SETTINGS | undefined;
  let service: CloudinaryService;

  beforeEach(() => {
    settings = SETTINGS;
    service = new CloudinaryService({ get: vi.fn(() => settings) } as unknown as ConfigService);
  });

  it('signs an upload into the given folder with the shared limits', () => {
    const result = service.createUploadSignature(FOLDER);
    expect(result).toMatchObject({
      uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
      apiKey: 'key',
      folder: FOLDER,
      allowedFormats: CLOUDINARY_ALLOWED_FORMATS,
      maxFileSizeBytes: CLOUDINARY_IMAGE_MAX_BYTES,
    });
    expect(result.signature).toBe(
      signCloudinaryParams({ allowed_formats: CLOUDINARY_ALLOWED_FORMATS, folder: FOLDER, timestamp: result.timestamp }, 'secret'),
    );
  });

  it.each([
    ['missing settings', undefined],
    ['an empty secret', { ...SETTINGS, apiSecret: '' }],
  ])('is disabled with %s', (_label, value) => {
    settings = value;
    expect(service.isEnabled()).toBe(false);
    expect(() => service.createUploadSignature(FOLDER)).toThrow(ServiceUnavailableException);
    expect(service.isUploadedImageInFolder(IMAGE, FOLDER)).toBe(false);
  });

  it('accepts an image in the folder, with or without a version segment', () => {
    expect(service.isUploadedImageInFolder(IMAGE, FOLDER)).toBe(true);
    expect(service.isUploadedImageInFolder(IMAGE.replace('v1730000000/', ''), FOLDER)).toBe(true);
  });

  it.each([
    ['another folder', IMAGE.replace('vendor-1', 'vendor-2')],
    ['a folder sharing a prefix', IMAGE.replace('vendor-1/', 'vendor-10/')],
    ['another cloud', IMAGE.replace('demo-cloud', 'other-cloud')],
    ['a non-Cloudinary host', 'https://evil.example.com/a.jpg'],
    ['plain http', IMAGE.replace('https://', 'http://')],
    ['a nested path', IMAGE.replace('logo_1.png', 'x/logo_1.png')],
    ['a disallowed extension', IMAGE.replace('.png', '.gif')],
  ])('rejects %s', (_label, url) => {
    expect(service.isUploadedImageInFolder(url, FOLDER)).toBe(false);
  });
});

describe('signCloudinaryParams', () => {
  it('hashes the sorted params followed by the secret', () => {
    const expected = createHash('sha1').update('folder=a&timestamp=1secret').digest('hex');
    expect(signCloudinaryParams({ timestamp: 1, folder: 'a' }, 'secret')).toBe(expected);
  });
});
