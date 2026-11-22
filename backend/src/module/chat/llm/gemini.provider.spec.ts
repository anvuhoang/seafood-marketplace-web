import { afterEach, describe, expect, it, vi } from 'vitest';

// The real package cannot be loaded in this test pool; the provider only needs its name here.
vi.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import type { ConfigService } from '@nestjs/config';
import { GeminiProvider, parseSse, toGeminiContents, toGeminiFunctions } from './gemini.provider.js';
import { LlmError, type LlmChunk, type LlmRequest } from './llm.types.js';

const settings = (overrides: Record<string, unknown> = {}) =>
  ({
    get: () => ({
      geminiApiKey: 'test-key',
      chatModel: 'chat-model',
      embedModel: 'embed-model',
      embedDimensions: 8,
      timeoutMs: 2000,
      ...overrides,
    }),
  }) as unknown as ConfigService;

const encoder = new TextEncoder();

/** A server-sent-events response made of the given JSON events. */
function sse(events: unknown[], init: ResponseInit = {}): Response {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
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

const part = (parts: unknown[], finishReason?: string) => ({ candidates: [{ content: { parts }, ...(finishReason && { finishReason }) }] });

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

const request: LlmRequest = {
  system: 'Bạn là trợ lý.',
  messages: [{ role: 'user', text: 'Tôm sú giá bao nhiêu?' }],
  tools: [{ name: 'search_products', description: 'Tìm', parameters: { type: 'object', properties: {} } }],
  maxOutputTokens: 500,
};

afterEach(() => vi.unstubAllGlobals());

describe('toGeminiContents', () => {
  it('maps the three kinds of message', () => {
    const raw = { functionCall: { name: 'search_products', args: { query: 'tôm' } }, thoughtSignature: 'sig' };
    const contents = toGeminiContents([
      { role: 'user', text: 'tôm' },
      { role: 'assistant', text: 'Để mình tìm', toolCalls: [{ id: 'c1', name: 'search_products', args: { query: 'tôm' }, raw }] },
      { role: 'tool', results: [{ id: 'c1', name: 'search_products', result: { total: 1 } }] },
    ]);
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'tôm' }] },
      { role: 'model', parts: [{ text: 'Để mình tìm' }, raw] },
      { role: 'user', parts: [{ functionResponse: { name: 'search_products', response: { result: { total: 1 } } } }] },
    ]);
  });

  it('builds a function call when there is no raw one, and skips an empty assistant message', () => {
    const contents = toGeminiContents([
      { role: 'assistant', text: '' },
      { role: 'assistant', text: '', toolCalls: [{ id: 'c', name: 'x', args: { a: 1 } }] },
    ]);
    expect(contents).toEqual([{ role: 'model', parts: [{ functionCall: { name: 'x', args: { a: 1 } } }] }]);
  });
});

describe('toGeminiFunctions', () => {
  it('leaves out `parameters` for a tool without arguments (Gemini refuses an empty object)', () => {
    const functions = toGeminiFunctions([
      { name: 'list_orders', description: 'Liệt kê', parameters: { type: 'object', properties: {} } },
      { name: 'search', description: 'Tìm', parameters: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] } },
    ]);
    expect(functions[0]).toEqual({ name: 'list_orders', description: 'Liệt kê' });
    expect(functions[1]).toMatchObject({ name: 'search', parameters: { required: ['q'] } });
  });
});

describe('parseSse', () => {
  it('reads events split across chunks and written with CRLF', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"a":1}\r\n\r\ndata: {"b"'));
        controller.enqueue(encoder.encode(':2}\n\n: comment\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    expect(await collect(parseSse(stream))).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('refuses a broken event', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {nope\n\n'));
        controller.close();
      },
    });
    await expect(collect(parseSse(stream))).rejects.toMatchObject({ code: 'bad_response' });
  });
});

describe('GeminiProvider.generate', () => {
  it('streams text, skips the model\'s thoughts and returns tool calls with their raw part', async () => {
    const functionCallPart = { functionCall: { name: 'search_products', args: { query: 'tôm' } }, thoughtSignature: 'abc' };
    const fetchMock = vi.fn(async () =>
      sse([part([{ text: 'hmm', thought: true }]), part([{ text: 'Để mình ' }]), part([{ text: 'tìm.' }, functionCallPart], 'STOP')]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const chunks = await collect(new GeminiProvider(settings()).generate(request));

    expect(chunks).toEqual<LlmChunk[]>([
      { type: 'text', text: 'Để mình ' },
      { type: 'text', text: 'tìm.' },
      { type: 'tool_call', call: { id: 'call_1', name: 'search_products', args: { query: 'tôm' }, raw: functionCallPart } },
    ]);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/models/chat-model:streamGenerateContent?alt=sse');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(init.body as string);
    expect(body.systemInstruction.parts[0].text).toBe('Bạn là trợ lý.');
    expect(body.tools[0].functionDeclarations[0].name).toBe('search_products');
    expect(body.generationConfig.maxOutputTokens).toBe(500);
  });

  it('reports the tokens of the call once, the last count winning, with the model\'s thoughts as output', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sse([
          { ...part([{ text: 'Chào ' }]), usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 1 } },
          { ...part([{ text: 'bạn' }], 'STOP'), usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 4, thoughtsTokenCount: 30 } },
        ]),
      ),
    );
    const chunks = await collect(new GeminiProvider(settings()).generate(request));
    expect(chunks.filter((chunk) => chunk.type === 'usage')).toEqual([{ type: 'usage', inputTokens: 120, outputTokens: 34 }]);
    expect(chunks.at(-1)?.type).toBe('usage');
  });

  it('sends no tools when none are offered', async () => {
    const fetchMock = vi.fn(async () => sse([part([{ text: 'ok' }])]));
    vi.stubGlobal('fetch', fetchMock);
    await collect(new GeminiProvider(settings()).generate({ ...request, tools: [] }));
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.tools).toBeUndefined();
  });

  it.each([
    [429, 'rate_limited'],
    [400, 'bad_response'],
    [401, 'unavailable'],
    [503, 'unavailable'],
  ])('maps HTTP %i to "%s"', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"x"}', { status })));
    await expect(collect(new GeminiProvider(settings()).generate(request))).rejects.toMatchObject({ code });
  });

  it('reports a blocked prompt, a blocked answer and an empty answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([{ promptFeedback: { blockReason: 'SAFETY' } }])));
    await expect(collect(new GeminiProvider(settings()).generate(request))).rejects.toMatchObject({ code: 'blocked' });

    vi.stubGlobal('fetch', vi.fn(async () => sse([part([], 'SAFETY')])));
    await expect(collect(new GeminiProvider(settings()).generate(request))).rejects.toMatchObject({ code: 'blocked' });

    vi.stubGlobal('fetch', vi.fn(async () => sse([part([], 'STOP')])));
    await expect(collect(new GeminiProvider(settings()).generate(request))).rejects.toMatchObject({ code: 'bad_response' });
  });

  it('is unavailable without a key, or when the network fails', async () => {
    await expect(collect(new GeminiProvider(settings({ geminiApiKey: '' })).generate(request))).rejects.toMatchObject({ code: 'unavailable' });

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    await expect(collect(new GeminiProvider(settings()).generate(request))).rejects.toBeInstanceOf(LlmError);
  });

  it('gives up with "timeout" when the model is too slow', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      ),
    );
    await expect(collect(new GeminiProvider(settings({ timeoutMs: 30 })).generate(request))).rejects.toMatchObject({ code: 'timeout' });
  });
});

describe('GeminiProvider.embed', () => {
  const answer = (count: number) =>
    new Response(JSON.stringify({ embeddings: Array.from({ length: count }, (_, index) => ({ values: [index, 1] })) }), { status: 200 });

  it('embeds in batches of 50 with the right task type', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => answer(JSON.parse(init.body as string).requests.length));
    vi.stubGlobal('fetch', fetchMock);

    const vectors = await new GeminiProvider(settings()).embed(Array.from({ length: 60 }, (_, index) => `đoạn ${index}`), 'document');

    expect(vectors).toHaveLength(60);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(first.requests).toHaveLength(50);
    expect(first.requests[0]).toMatchObject({ model: 'models/embed-model', taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 8 });

    await new GeminiProvider(settings()).embed(['câu hỏi'], 'query');
    const query = JSON.parse((fetchMock.mock.calls[2] as unknown as [string, RequestInit])[1].body as string);
    expect(query.requests[0].taskType).toBe('RETRIEVAL_QUERY');
  });

  it('does nothing for no texts, and refuses an answer that does not match', async () => {
    const fetchMock = vi.fn(async () => answer(1));
    vi.stubGlobal('fetch', fetchMock);
    expect(await new GeminiProvider(settings()).embed([], 'query')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(new GeminiProvider(settings()).embed(['a', 'b'], 'query')).rejects.toMatchObject({ code: 'bad_response' });
  });
});
