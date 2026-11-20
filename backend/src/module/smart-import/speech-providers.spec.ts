import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FallbackSpeechProvider } from './fallback-speech.provider.js';
import { LocalSpeechProvider } from './local.provider.js';
import { AiProviderError, type SpeechToText } from './smart-import.types.js';

const AUDIO = Buffer.from('recording');

const settings = {
  aiServiceUrl: 'http://localhost:8000/',
  aiServiceToken: 'secret-token',
  aiServiceTimeoutMs: 5000,
};
const local = (overrides: Partial<typeof settings> = {}) =>
  new LocalSpeechProvider({
    get: () => ({ ...settings, ...overrides }),
  } as unknown as ConfigService);

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('LocalSpeechProvider', () => {
  it('posts the recording with the token and returns the text and the model name', async () => {
    const fetchMock = vi.fn(() => reply(200, { text: ' tôm sú ', engine: 'whisper-small-vimd' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await local().transcribe(AUDIO, 'recording.webm', 'audio/webm');

    expect(result).toEqual({ text: 'tôm sú', engine: 'local:whisper-small-vimd' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:8000/transcribe');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'X-AI-Token': 'secret-token' });
    expect((init.body as FormData).get('audio')).toBeInstanceOf(Blob);
  });

  it('sends no token header when none is configured', async () => {
    const fetchMock = vi.fn(() => reply(200, { text: 'tôm', engine: 'x' }));
    vi.stubGlobal('fetch', fetchMock);
    await local({ aiServiceToken: '' }).transcribe(AUDIO, 'a.webm', 'audio/webm');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toEqual({});
  });

  it.each([
    [400, 'bad_response'],
    [413, 'bad_response'],
    [422, 'bad_response'],
    [401, 'unavailable'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ] as const)('maps status %d to %s', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn(() => reply(status, { detail: 'x' })));
    await expect(local().transcribe(AUDIO, 'a.webm', 'audio/webm')).rejects.toMatchObject({
      kind,
    });
  });

  it('says unavailable when the service cannot be reached and timeout when it is too slow', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('fetch failed'))));
    await expect(local().transcribe(AUDIO, 'a.webm', 'audio/webm')).rejects.toMatchObject({
      kind: 'unavailable',
    });

    const timeout = new Error('timed out');
    timeout.name = 'TimeoutError';
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(timeout)));
    await expect(local().transcribe(AUDIO, 'a.webm', 'audio/webm')).rejects.toMatchObject({
      kind: 'timeout',
    });
  });

  it('treats an empty or non-JSON answer as unreadable and never leaks the token', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(200, { text: '   ' })));
    await expect(local().transcribe(AUDIO, 'a.webm', 'audio/webm')).rejects.toMatchObject({
      kind: 'bad_response',
    });

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<html>', { status: 200 }))));
    const error = await local()
      .transcribe(AUDIO, 'a.webm', 'audio/webm')
      .catch((caught: AiProviderError) => caught);
    expect(error).toMatchObject({ kind: 'bad_response' });
    expect((error as Error).message).not.toContain('secret-token');
  });

  it('is unavailable when no service address is configured', async () => {
    await expect(local({ aiServiceUrl: '' }).transcribe(AUDIO, 'a.webm', 'audio/webm')).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });
});

describe('FallbackSpeechProvider', () => {
  const ok = (engine: string): SpeechToText => ({
    transcribe: vi.fn().mockResolvedValue({ text: 'tôm', engine }),
  });
  const failing = (kind: AiProviderError['kind']): SpeechToText => ({
    transcribe: vi.fn().mockRejectedValue(new AiProviderError(kind, 'boom')),
  });

  it('uses the primary when it works and never calls the fallback', async () => {
    const fallback = ok('groq');
    const provider = new FallbackSpeechProvider(ok('local:x'), fallback);
    await expect(provider.transcribe(AUDIO, 'a.webm', 'audio/webm')).resolves.toEqual({
      text: 'tôm',
      engine: 'local:x',
    });
    expect(fallback.transcribe).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'timeout'] as const)('falls back to Groq when the service is %s', async (kind) => {
    const provider = new FallbackSpeechProvider(failing(kind), ok('groq'));
    await expect(provider.transcribe(AUDIO, 'a.webm', 'audio/webm')).resolves.toMatchObject({
      engine: 'groq',
    });
  });

  it('does not fall back when the service heard nothing, since another engine would too', async () => {
    const fallback = ok('groq');
    const provider = new FallbackSpeechProvider(failing('bad_response'), fallback);
    await expect(provider.transcribe(AUDIO, 'a.webm', 'audio/webm')).rejects.toMatchObject({
      kind: 'bad_response',
    });
    expect(fallback.transcribe).not.toHaveBeenCalled();
  });

  it('passes the error on when there is no fallback configured', async () => {
    const provider = new FallbackSpeechProvider(failing('unavailable'), null);
    await expect(provider.transcribe(AUDIO, 'a.webm', 'audio/webm')).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });

  it('passes the fallback error on too, so the vendor sees one clear message', async () => {
    const provider = new FallbackSpeechProvider(failing('timeout'), failing('rate_limited'));
    await expect(provider.transcribe(AUDIO, 'a.webm', 'audio/webm')).rejects.toMatchObject({
      kind: 'rate_limited',
    });
  });
});
