import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import {
  AUDIO_EMPTY,
  AUDIO_INVALID,
  AUDIO_MAX_BYTES,
  AUDIO_TOO_LARGE,
  detectAudioFormat,
  validateAudio,
} from './audio-validation.js';
import {
  SMART_IMPORT_MAX_CALLS,
  SMART_IMPORT_WINDOW_MS,
  SmartImportLimiter,
} from './smart-import.limiter.js';
import {
  SMART_IMPORT_NO_SPEECH,
  SMART_IMPORT_QUOTA,
  SMART_IMPORT_TIMEOUT,
  SMART_IMPORT_UNAVAILABLE,
  SMART_IMPORT_UNREADABLE,
  SmartImportService,
} from './smart-import.service.js';
import { AiProviderError } from './smart-import.types.js';
import { VENDOR_NOT_FOUND, VENDOR_READ_ONLY } from '../vendor/vendor-access.js';

const CATEGORY = '11111111-1111-4111-8111-111111111111';

/** A buffer that starts with the given bytes and is padded to a plausible size. */
const audioOf = (head: number[] | string, size = 4_000) => {
  const buffer = Buffer.alloc(size);
  Buffer.from(head as string, typeof head === 'string' ? 'latin1' : undefined).copy(buffer);
  return buffer;
};
const WEBM = audioOf([0x1a, 0x45, 0xdf, 0xa3]);

function build({
  provider = 'mock',
  vendorStatus = 'ACTIVE' as string | null,
  extract = vi.fn(),
  transcribe = vi.fn(),
}: {
  provider?: string;
  vendorStatus?: string | null;
  extract?: ReturnType<typeof vi.fn>;
  transcribe?: ReturnType<typeof vi.fn>;
} = {}) {
  const prisma = {
    vendor: {
      findUnique: vi.fn().mockResolvedValue(
        vendorStatus ? { id: 'vendor-1', status: vendorStatus } : null,
      ),
    },
    category: {
      findMany: vi.fn().mockResolvedValue([
        { id: CATEGORY, name: 'Tôm', parent: null },
        { id: 'hidden', name: 'Ẩn', parent: { isActive: false } },
      ]),
    },
  };
  const config = { get: vi.fn(() => ({ provider })) } as unknown as ConfigService;
  const service = new SmartImportService(
    prisma as never,
    config,
    new SmartImportLimiter(),
    { transcribe } as never,
    { extract } as never,
  );
  return { service, prisma, extract, transcribe };
}

const rejection = async (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => error as HttpException,
  );

describe('createDraft', () => {
  const answer = {
    name: 'Tôm sú',
    categoryId: CATEGORY,
    variants: [{ name: 'Size 30', unit: 'kg', price: '350k', stock: 40 }],
  };

  it('returns a normalised draft and never writes to the database', async () => {
    const { service, prisma, extract } = build({ extract: vi.fn().mockResolvedValue(answer) });

    const draft = await service.createDraft('user-1', 'tôm sú 350k');

    expect(draft.variants[0]).toMatchObject({ price: 350000, stock: 40, unit: 'kg' });
    expect(Object.keys(prisma).sort()).toEqual(['category', 'vendor']);
    expect(Object.keys(prisma.category)).toEqual(['findMany']);
    // Only visible categories are offered to the model.
    expect(extract.mock.calls[0][1]).toEqual({ categories: [{ id: CATEGORY, name: 'Tôm' }] });
  });

  it.each([
    ['rate_limited', 429, SMART_IMPORT_QUOTA],
    ['timeout', 504, SMART_IMPORT_TIMEOUT],
    ['bad_response', 502, SMART_IMPORT_UNREADABLE],
    ['unavailable', 503, SMART_IMPORT_UNAVAILABLE],
  ] as const)('answers a %s failure with %d and a clear message', async (kind, status, message) => {
    const { service } = build({
      extract: vi.fn().mockRejectedValue(new AiProviderError(kind, 'secret detail')),
    });

    const error = await rejection(service.createDraft('user-1', 'tôm sú'));

    expect(error).toBeInstanceOf(HttpException);
    expect(error?.getStatus()).toBe(status);
    expect(error?.message).toBe(message);
    expect(error?.message).not.toContain('secret detail');
  });

  it('treats a model answer that is not an object as unreadable', async () => {
    const { service } = build({ extract: vi.fn().mockResolvedValue('nope') });
    const error = await rejection(service.createDraft('user-1', 'tôm sú'));
    expect(error?.getStatus()).toBe(502);
    expect(error?.message).toBe(SMART_IMPORT_UNREADABLE);
  });

  it('answers 503 and never calls the AI while no provider is configured', async () => {
    const { service, extract } = build({ provider: 'off' });
    const error = await rejection(service.createDraft('user-1', 'tôm sú'));
    expect(error?.getStatus()).toBe(503);
    expect(extract).not.toHaveBeenCalled();
  });

  it('refuses a user without a store and a store that is read-only', async () => {
    const none = await rejection(build({ vendorStatus: null }).service.createDraft('u', 'tôm'));
    expect(none?.message).toBe(VENDOR_NOT_FOUND);

    const suspended = await rejection(
      build({ vendorStatus: 'SUSPENDED' }).service.createDraft('u', 'tôm'),
    );
    expect(suspended?.getStatus()).toBe(403);
    expect(suspended?.message).toBe(VENDOR_READ_ONLY);
  });

  it('stops a vendor who calls it too often', async () => {
    const { service } = build({ extract: vi.fn().mockResolvedValue(answer) });
    for (let i = 0; i < SMART_IMPORT_MAX_CALLS; i += 1) {
      await service.createDraft('user-1', 'tôm sú');
    }
    const error = await rejection(service.createDraft('user-1', 'tôm sú'));
    expect(error?.getStatus()).toBe(429);
    // Another vendor is not affected.
    await expect(service.createDraft('user-2', 'tôm sú')).resolves.toBeDefined();
  });
});

describe('transcribe', () => {
  it('sends the detected file name and type to the speech service', async () => {
    const transcribe = vi.fn().mockResolvedValue('tôm sú ba trăm rưỡi');
    const { service } = build({ transcribe });

    await expect(service.transcribe('user-1', { buffer: WEBM })).resolves.toBe(
      'tôm sú ba trăm rưỡi',
    );
    expect(transcribe).toHaveBeenCalledWith(WEBM, 'recording.webm', 'audio/webm');
  });

  it('does not call the speech service for a file that is not audio', async () => {
    const transcribe = vi.fn();
    const { service } = build({ transcribe });
    const error = await rejection(
      service.transcribe('user-1', { buffer: audioOf('<html><body>hello</body></html>') }),
    );
    expect(error?.getStatus()).toBe(400);
    expect(error?.message).toBe(AUDIO_INVALID);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('answers with a clear message when no speech is recognised', async () => {
    const { service } = build({
      transcribe: vi.fn().mockRejectedValue(new AiProviderError('bad_response', 'empty')),
    });
    const error = await rejection(service.transcribe('user-1', { buffer: WEBM }));
    expect(error?.getStatus()).toBe(502);
    expect(error?.message).toBe(SMART_IMPORT_NO_SPEECH);
  });
});

describe('validateAudio', () => {
  it.each([
    ['webm', [0x1a, 0x45, 0xdf, 0xa3]],
    ['ogg', 'OggS'],
    ['wav', 'RIFF\0\0\0\0WAVE'],
    ['mp3', 'ID3'],
    ['mp3', [0xff, 0xfb, 0x90, 0x00]],
  ] as const)('recognises %s by its first bytes', (format, head) => {
    expect(detectAudioFormat(audioOf(head as number[] | string))).toBe(format);
  });

  it('recognises an m4a/mp4 container', () => {
    const buffer = Buffer.alloc(4_000);
    buffer.write('ftypM4A ', 4, 'latin1');
    expect(detectAudioFormat(buffer)).toBe('mp4');
  });

  it('ignores the name and type the client claims', () => {
    const valid = validateAudio({ buffer: WEBM, mimetype: 'text/html', originalname: 'x.exe' } as never);
    expect(valid).toMatchObject({ filename: 'recording.webm', mimeType: 'audio/webm' });
  });

  it.each([
    ['no file', undefined, AUDIO_EMPTY],
    ['an empty file', { buffer: Buffer.alloc(0) }, AUDIO_EMPTY],
    ['a file too short to hold speech', { buffer: audioOf([0x1a, 0x45, 0xdf, 0xa3], 100) }, AUDIO_EMPTY],
    ['a file over the limit', { buffer: audioOf([0x1a, 0x45, 0xdf, 0xa3], AUDIO_MAX_BYTES + 1) }, AUDIO_TOO_LARGE],
    ['an image', { buffer: audioOf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }, AUDIO_INVALID],
  ])('refuses %s', (_label, file, message) => {
    expect(() => validateAudio(file)).toThrow(message);
  });
});

describe('SmartImportLimiter', () => {
  it('allows calls again once the window has passed', () => {
    const limiter = new SmartImportLimiter();
    for (let i = 0; i < SMART_IMPORT_MAX_CALLS; i += 1) limiter.consume('a', 1_000);
    expect(() => limiter.consume('a', 1_000)).toThrow(HttpException);
    expect(() => limiter.consume('a', 1_000 + SMART_IMPORT_WINDOW_MS)).not.toThrow();
  });
});
