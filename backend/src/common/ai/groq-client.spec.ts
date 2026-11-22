import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiProviderError } from './ai-provider-error.js';
import { groqPost, parseChatJson } from './groq-client.js';

const kindOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => (error instanceof AiProviderError ? error.kind : 'other'),
  );

describe('groqPost', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the key as a bearer token and returns the JSON body', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);

    await expect(groqPost('key-1', 1000, '/chat/completions', '{}')).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer key-1');
  });

  it.each([
    [429, 'rate_limited'],
    [401, 'unavailable'],
    [500, 'unavailable'],
  ])('maps status %d to %s without leaking the key', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    const error = await groqPost('secret-key', 1000, '/x', '{}').catch((e: Error) => e);
    expect((error as AiProviderError).kind).toBe(kind);
    expect((error as Error).message).not.toContain('secret-key');
  });

  it('maps a timeout and a network failure', async () => {
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout));
    expect(await kindOf(groqPost('k', 1, '/x', '{}'))).toBe('timeout');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    expect(await kindOf(groqPost('k', 1, '/x', '{}'))).toBe('unavailable');
  });

  it('treats a body that is not JSON as bad_response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })));
    expect(await kindOf(groqPost('k', 1000, '/x', '{}'))).toBe('bad_response');
  });
});

describe('parseChatJson', () => {
  it('reads the JSON object in the first choice', () => {
    expect(parseChatJson({ choices: [{ message: { content: '{"a":1}' } }] })).toEqual({ a: 1 });
  });

  it.each([
    ['no choices', {}],
    ['empty content', { choices: [{ message: { content: ' ' } }] }],
    ['content that is not JSON', { choices: [{ message: { content: 'Tôm sú' } }] }],
  ])('treats %s as bad_response', (_label, body) => {
    expect(() => parseChatJson(body)).toThrow(AiProviderError);
  });
});
