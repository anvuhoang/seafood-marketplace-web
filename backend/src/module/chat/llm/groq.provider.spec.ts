import { afterEach, describe, expect, it, vi } from 'vitest';

// The real package cannot be loaded in this test pool; the provider only needs its name here.
vi.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import type { ConfigService } from '@nestjs/config';
import { GroqProvider, toGroqMessages, toGroqTools } from './groq.provider.js';
import { LlmError, type LlmChunk, type LlmRequest } from './llm.types.js';
import { LOCAL_EMBED_SIZE, localEmbeddings } from './local-embedding.js';

const settings = (overrides: Record<string, unknown> = {}) =>
  ({ get: () => ({ groqApiKey: 'gsk-test', groqChatModel: 'llama-test', timeoutMs: 2000, ...overrides }) }) as unknown as ConfigService;

const encoder = new TextEncoder();

/** A server-sent-events response made of the given JSON events, ending with [DONE] like the real API. */
function sse(events: unknown[], init: ResponseInit = {}): Response {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.close();
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' }, ...init },
  );
}

const delta = (value: Record<string, unknown>, finish: string | null = null) => ({ choices: [{ delta: value, finish_reason: finish }] });

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

const request: LlmRequest = {
  system: 'Bạn là trợ lý.',
  messages: [{ role: 'user', text: 'Tôm sú giá bao nhiêu?' }],
  tools: [{ name: 'search_products', description: 'Tìm', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }],
  maxOutputTokens: 500,
};

afterEach(() => vi.restoreAllMocks());

describe('toGroqMessages', () => {
  it('starts with the instructions and keeps the order of the conversation', () => {
    const messages = toGroqMessages('Hệ thống', [
      { role: 'user', text: 'Chào' },
      { role: 'assistant', text: 'Xin chào' },
    ]);
    expect(messages).toEqual([
      { role: 'system', content: 'Hệ thống' },
      { role: 'user', content: 'Chào' },
      { role: 'assistant', content: 'Xin chào' },
    ]);
  });

  it('writes tool calls with their arguments as JSON text and each tool answer as its own message', () => {
    const messages = toGroqMessages('s', [
      { role: 'user', text: 'Tìm tôm' },
      { role: 'assistant', text: '', toolCalls: [{ id: 'call_1', name: 'search_products', args: { query: 'tôm' } }] },
      { role: 'tool', results: [{ id: 'call_1', name: 'search_products', result: { items: [1] } }] },
    ]);
    expect(messages[2]).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search_products', arguments: '{"query":"tôm"}' } }],
    });
    expect(messages[3]).toEqual({ role: 'tool', tool_call_id: 'call_1', content: '{"items":[1]}' });
  });

  it('leaves out an assistant turn that said nothing and called nothing', () => {
    expect(toGroqMessages('s', [{ role: 'assistant', text: '' }])).toHaveLength(1);
  });
});

describe('toGroqTools', () => {
  it('declares each tool as a function with its JSON schema', () => {
    expect(toGroqTools(request.tools)).toEqual([
      { type: 'function', function: { name: 'search_products', description: 'Tìm', parameters: request.tools[0].parameters } },
    ]);
  });
});

describe('GroqProvider.generate', () => {
  it('streams the text and reports the tokens used', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sse([delta({ content: 'Tôm sú ' }), delta({ content: '420.000đ/kg' }, 'stop'), { choices: [], usage: { prompt_tokens: 120, completion_tokens: 9 } }]),
    );
    const chunks = await collect(new GroqProvider(settings()).generate(request));
    expect(chunks).toEqual<LlmChunk[]>([
      { type: 'text', text: 'Tôm sú ' },
      { type: 'text', text: '420.000đ/kg' },
      { type: 'usage', inputTokens: 120, outputTokens: 9 },
    ]);
  });

  it('puts a tool call back together from the pieces it arrives in', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sse([
        delta({ tool_calls: [{ index: 0, id: 'call_a', function: { name: 'search_products', arguments: '' } }] }),
        delta({ tool_calls: [{ index: 0, function: { arguments: '{"query":' } }] }),
        delta({ tool_calls: [{ index: 0, function: { arguments: '"tôm hùm"}' } }] }, 'tool_calls'),
        { x_groq: { usage: { prompt_tokens: 50, completion_tokens: 12 } } },
      ]),
    );
    const chunks = await collect(new GroqProvider(settings()).generate(request));
    expect(chunks[0]).toEqual({ type: 'tool_call', call: { id: 'call_a', name: 'search_products', args: { query: 'tôm hùm' } } });
    expect(chunks[1]).toEqual({ type: 'usage', inputTokens: 50, outputTokens: 12 });
  });

  it('gives a tool call with no arguments an empty object, and makes up an id when there is none', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sse([delta({ tool_calls: [{ index: 0, function: { name: 'list_my_recent_orders' } }] }, 'tool_calls')]));
    const [call] = await collect(new GroqProvider(settings()).generate(request));
    expect(call).toEqual({ type: 'tool_call', call: { id: 'call_1', name: 'list_my_recent_orders', args: {} } });
  });

  it('sends the key, the model, the tools, and a short think for gpt-oss', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(sse([delta({ content: 'ok' })]));
    await collect(new GroqProvider(settings({ groqChatModel: 'openai/gpt-oss-120b' })).generate(request));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.groq.com/openai/v1/chat/completions');
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer gsk-test');
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ model: 'openai/gpt-oss-120b', stream: true, max_completion_tokens: 500, reasoning_effort: 'low' });
    expect(body.tools).toHaveLength(1);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Bạn là trợ lý.' });
  });

  it('does not ask a model that does not think to think', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(sse([delta({ content: 'ok' })]));
    await collect(new GroqProvider(settings()).generate(request));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).not.toHaveProperty('reasoning_effort');
  });

  it('refuses an empty answer', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sse([delta({ content: null }, 'stop')]));
    await expect(collect(new GroqProvider(settings()).generate(request))).rejects.toMatchObject({ code: 'bad_response' });
  });

  it('refuses tool arguments that are not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sse([delta({ tool_calls: [{ index: 0, id: 'c', function: { name: 'search_products', arguments: '{"query":' } }] }, 'tool_calls')]),
    );
    await expect(collect(new GroqProvider(settings()).generate(request))).rejects.toMatchObject({ code: 'bad_response' });
  });

  it.each([
    [429, 'rate_limited'],
    [400, 'bad_response'],
    [401, 'unavailable'],
    [503, 'unavailable'],
  ])('maps an HTTP %i answer to %s', async (status, code) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":{"message":"no"}}', { status }));
    await expect(collect(new GroqProvider(settings()).generate(request))).rejects.toMatchObject({ code });
  });

  it('says so when the network fails, and when the model is too slow', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(collect(new GroqProvider(settings()).generate(request))).rejects.toMatchObject({ code: 'unavailable' });

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_url, init) => {
      const signal = init?.signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    });
    await expect(collect(new GroqProvider(settings({ timeoutMs: 20 })).generate(request))).rejects.toMatchObject({ code: 'timeout' });
  });

  it('is unavailable without a key', async () => {
    await expect(collect(new GroqProvider(settings({ groqApiKey: '' })).generate(request))).rejects.toBeInstanceOf(LlmError);
  });
});

describe('local embedding (what Groq uses, as it has no embedding model)', () => {
  it('gives one unit-length vector of the same size for each text, with no network', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const vectors = await new GroqProvider(settings()).embed(['Chính sách đổi trả', 'Phí giao hàng'], 'document');
    expect(vectors).toHaveLength(2);
    for (const vector of vectors) {
      expect(vector).toHaveLength(LOCAL_EMBED_SIZE);
      expect(Math.hypot(...vector)).toBeCloseTo(1, 5);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is the same every time, and a text that shares words is closer than one that does not', () => {
    const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
    const [question, same, related, unrelated] = localEmbeddings([
      'chính sách đổi trả hàng',
      'chính sách đổi trả hàng',
      'Đổi trả hàng trong 24 giờ nếu hải sản không tươi',
      'Cách bảo quản cua ghẹ trong tủ lạnh',
    ]);
    expect(dot(question, same)).toBeCloseTo(1, 5);
    expect(dot(question, related)).toBeGreaterThan(dot(question, unrelated));
  });
});
