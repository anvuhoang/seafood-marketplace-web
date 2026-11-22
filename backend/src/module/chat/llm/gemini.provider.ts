import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmError,
  type LlmChunk,
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmTask,
  type LlmToolDeclaration,
} from './llm.types.js';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
/** The embedding endpoint takes at most 100 texts per call. */
const EMBED_BATCH_SIZE = 50;
/** Reasons for which Gemini stops without an answer. */
const BLOCKED_FINISH_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION']);

export interface GeminiSettings {
  geminiApiKey: string;
  chatModel: string;
  embedModel: string;
  embedDimensions: number;
  timeoutMs: number;
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  [other: string]: unknown;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiEvent {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
  /** Running totals: every event carries them, the last one is the final count. */
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
}

/**
 * The tools in Gemini's shape. Gemini refuses a function whose `parameters` is an object with no properties
 * (INVALID_ARGUMENT), so a tool that takes no argument is declared without `parameters` at all.
 */
export function toGeminiFunctions(tools: LlmToolDeclaration[]): Array<Record<string, unknown>> {
  return tools.map(({ name, description, parameters }) => ({
    name,
    description,
    ...(Object.keys(parameters.properties).length > 0 && { parameters }),
  }));
}

/** The conversation in Gemini's shape. Tool answers travel as a "user" turn of functionResponse parts. */
export function toGeminiContents(messages: LlmMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: message.text }] });
    } else if (message.role === 'assistant') {
      const parts: GeminiPart[] = [];
      if (message.text) parts.push({ text: message.text });
      for (const call of message.toolCalls ?? []) {
        // The part is echoed exactly as it came, so any hidden field the model needs back is kept.
        parts.push((call.raw as GeminiPart | undefined) ?? { functionCall: { name: call.name, args: call.args } });
      }
      if (parts.length > 0) contents.push({ role: 'model', parts });
    } else {
      contents.push({
        role: 'user',
        parts: message.results.map((item) => ({
          functionResponse: { name: item.name, response: { result: item.result } },
        })),
      });
    }
  }
  return contents;
}

/** Reads a server-sent-events body and yields the JSON of each `data:` line. */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const parseBlock = (block: string): unknown | undefined => {
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data || data === '[DONE]') return undefined;
    try {
      return JSON.parse(data);
    } catch {
      throw new LlmError('bad_response', 'The model sent a broken event.');
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
      let end: number;
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const event = parseBlock(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (event !== undefined) yield event;
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const event = parseBlock(buffer);
      if (event !== undefined) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

/** Google Gemini over its REST API: streaming chat with function calling, and text embeddings. */
@Injectable()
export class GeminiProvider implements LlmProvider {
  constructor(private readonly config: ConfigService) {}

  private settings(): GeminiSettings {
    const settings = this.config.get<GeminiSettings>('chat');
    if (!settings?.geminiApiKey) {
      throw new LlmError('unavailable', 'GEMINI_API_KEY is not set.');
    }
    return settings;
  }

  async *generate(request: LlmRequest): AsyncGenerator<LlmChunk> {
    const settings = this.settings();
    const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(settings.chatModel)}:streamGenerateContent?alt=sse`;
    const response = await this.post(
      settings,
      url,
      {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: toGeminiContents(request.messages),
        ...(request.tools.length > 0 && {
          tools: [{ functionDeclarations: toGeminiFunctions(request.tools) }],
        }),
        generationConfig: { maxOutputTokens: request.maxOutputTokens, temperature: 0.4 },
      },
      request.signal,
    );
    if (!response.body) throw new LlmError('bad_response', 'The model sent no body.');

    let produced = false;
    let calls = 0;
    let usage: LlmChunk | null = null;
    for await (const event of parseSse(response.body) as AsyncGenerator<GeminiEvent>) {
      if (event.usageMetadata) {
        // The model's "thoughts" are billed like its answer, so they count as output.
        usage = {
          type: 'usage',
          inputTokens: event.usageMetadata.promptTokenCount ?? 0,
          outputTokens: (event.usageMetadata.candidatesTokenCount ?? 0) + (event.usageMetadata.thoughtsTokenCount ?? 0),
        };
      }
      if (event.promptFeedback?.blockReason) {
        throw new LlmError('blocked', `Blocked: ${event.promptFeedback.blockReason}`);
      }
      const candidate = event.candidates?.[0];
      for (const part of candidate?.content?.parts ?? []) {
        if (part.thought) continue;
        if (part.functionCall) {
          produced = true;
          yield {
            type: 'tool_call',
            call: {
              id: `call_${++calls}`,
              name: part.functionCall.name,
              args: part.functionCall.args ?? {},
              raw: part,
            },
          };
        } else if (typeof part.text === 'string' && part.text !== '') {
          produced = true;
          yield { type: 'text', text: part.text };
        }
      }
      if (!produced && candidate?.finishReason && BLOCKED_FINISH_REASONS.has(candidate.finishReason)) {
        throw new LlmError('blocked', `Stopped: ${candidate.finishReason}`);
      }
    }
    if (usage) yield usage;
    if (!produced) throw new LlmError('bad_response', 'The model gave an empty answer.');
  }

  async embed(texts: string[], task: LlmTask): Promise<number[][]> {
    if (texts.length === 0) return [];
    const settings = this.settings();
    const model = `models/${settings.embedModel}`;
    const url = `${GEMINI_BASE_URL}/${model}:batchEmbedContents`;
    const vectors: number[][] = [];

    for (let start = 0; start < texts.length; start += EMBED_BATCH_SIZE) {
      const batch = texts.slice(start, start + EMBED_BATCH_SIZE);
      const response = await this.post(settings, url, {
        requests: batch.map((text) => ({
          model,
          content: { parts: [{ text }] },
          taskType: task === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
          outputDimensionality: settings.embedDimensions,
        })),
      });
      const body = (await response.json()) as { embeddings?: Array<{ values?: number[] }> };
      const embeddings = body.embeddings ?? [];
      if (embeddings.length !== batch.length || embeddings.some((item) => !Array.isArray(item.values))) {
        throw new LlmError('bad_response', 'The embedding answer does not match the request.');
      }
      vectors.push(...embeddings.map((item) => item.values as number[]));
    }
    return vectors;
  }

  private async post(
    settings: GeminiSettings,
    url: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<Response> {
    const timeout = AbortSignal.timeout(settings.timeoutMs);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.geminiApiKey },
        body: JSON.stringify(body),
        signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
      });
    } catch (error) {
      if (timeout.aborted) throw new LlmError('timeout', 'The model took too long to answer.');
      if (signal?.aborted) throw error;
      throw new LlmError('unavailable', `Could not reach the model: ${String(error)}`);
    }

    if (response.ok) return response;
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    if (response.status === 429) throw new LlmError('rate_limited', `Rate limited. ${detail}`);
    if (response.status === 400) throw new LlmError('bad_response', `Bad request. ${detail}`);
    throw new LlmError('unavailable', `The model answered ${response.status}. ${detail}`);
  }
}
