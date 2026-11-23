import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GROQ_BASE_URL } from '../../../common/ai/groq-client.js';
import { parseSse } from './gemini.provider.js';
import { localEmbeddings } from './local-embedding.js';
import {
  LlmError,
  type LlmChunk,
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmTask,
  type LlmToolDeclaration,
} from './llm.types.js';


export interface GroqSettings {
  groqApiKey: string;
  groqChatModel: string;
  timeoutMs: number;
}

/** A message in the OpenAI shape that Groq speaks. */
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

interface GroqDelta {
  content?: string | null;
  tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>;
}

interface GroqEvent {
  choices?: Array<{ delta?: GroqDelta; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  /** Groq reports the usage of a streamed call here, in its last event. */
  x_groq?: { usage?: { prompt_tokens?: number; completion_tokens?: number } };
  error?: { message?: string };
}

/** The tools in the OpenAI shape. */
export function toGroqTools(tools: LlmToolDeclaration[]): Array<Record<string, unknown>> {
  return tools.map(({ name, description, parameters }) => ({ type: 'function', function: { name, description, parameters } }));
}

/** The conversation in the OpenAI shape: the instructions first, and one "tool" message for each tool answer. */
export function toGroqMessages(system: string, messages: LlmMessage[]): GroqMessage[] {
  const result: GroqMessage[] = [{ role: 'system', content: system }];
  for (const message of messages) {
    if (message.role === 'user') {
      result.push({ role: 'user', content: message.text });
    } else if (message.role === 'assistant') {
      const calls = message.toolCalls ?? [];
      if (!message.text && calls.length === 0) continue;
      result.push({
        role: 'assistant',
        content: message.text || null,
        ...(calls.length > 0 && {
          tool_calls: calls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: { name: call.name, arguments: JSON.stringify(call.args) },
          })),
        }),
      });
    } else {
      for (const item of message.results) {
        result.push({ role: 'tool', tool_call_id: item.id, content: JSON.stringify(item.result) });
      }
    }
  }
  return result;
}

/** Reads the arguments the model wrote for a tool; a broken or empty text means "no arguments". */
function parseArguments(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    throw new LlmError('bad_response', 'The model wrote tool arguments that are not valid JSON.');
  }
}

/**
 * Groq (an open model such as gpt-oss or Llama on Groq's servers) over its OpenAI-compatible API: streaming chat
 * with tool calling. Groq has no embedding model, so the help documents are embedded locally (see local-embedding.ts).
 * Chosen with CHAT_PROVIDER=groq; it uses the same GROQ_API_KEY as Smart Import and Visual Search.
 */
@Injectable()
export class GroqProvider implements LlmProvider {
  constructor(private readonly config: ConfigService) {}

  private settings(): GroqSettings {
    const settings = this.config.get<GroqSettings>('chat');
    if (!settings?.groqApiKey) throw new LlmError('unavailable', 'GROQ_API_KEY is not set.');
    return settings;
  }

  async *generate(request: LlmRequest): AsyncGenerator<LlmChunk> {
    const settings = this.settings();
    const response = await this.post(
      settings,
      {
        model: settings.groqChatModel,
        messages: toGroqMessages(request.system, request.messages),
        stream: true,
        stream_options: { include_usage: true },
        max_completion_tokens: request.maxOutputTokens,
        temperature: 0.4,
        ...(request.tools.length > 0 && { tools: toGroqTools(request.tools), tool_choice: 'auto' }),
        // gpt-oss thinks before it answers; a short think keeps a chat answer fast.
        ...(settings.groqChatModel.startsWith('openai/gpt-oss') && { reasoning_effort: 'low' }),
      },
      request.signal,
    );
    if (!response.body) throw new LlmError('bad_response', 'The model sent no body.');

    let produced = false;
    let usage: LlmChunk | null = null;
    const calls = new Map<number, { id: string; name: string; args: string }>();

    for await (const event of parseSse(response.body) as AsyncGenerator<GroqEvent>) {
      if (event.error) throw new LlmError('unavailable', `The model reported an error: ${event.error.message ?? ''}`);
      const counted = event.usage ?? event.x_groq?.usage;
      if (counted) {
        usage = { type: 'usage', inputTokens: counted.prompt_tokens ?? 0, outputTokens: counted.completion_tokens ?? 0 };
      }
      const choice = event.choices?.[0];
      const delta = choice?.delta;
      if (typeof delta?.content === 'string' && delta.content !== '') {
        produced = true;
        yield { type: 'text', text: delta.content };
      }
      // A tool call arrives in pieces: the name first, then the arguments a few characters at a time.
      for (const piece of delta?.tool_calls ?? []) {
        const call = calls.get(piece.index) ?? { id: '', name: '', args: '' };
        if (piece.id) call.id = piece.id;
        if (piece.function?.name) call.name += piece.function.name;
        if (piece.function?.arguments) call.args += piece.function.arguments;
        calls.set(piece.index, call);
      }
      if (choice?.finish_reason === 'content_filter' && !produced && calls.size === 0) {
        throw new LlmError('blocked', 'The answer was stopped by the content filter.');
      }
    }

    for (const [index, call] of [...calls.entries()].sort((a, b) => a[0] - b[0])) {
      if (!call.name) continue;
      produced = true;
      yield { type: 'tool_call', call: { id: call.id || `call_${index + 1}`, name: call.name, args: parseArguments(call.args) } };
    }
    if (usage) yield usage;
    if (!produced) throw new LlmError('bad_response', 'The model gave an empty answer.');
  }

  /** Groq has no embedding model: the help documents and the questions are embedded on this server. */
  async embed(texts: string[], _task: LlmTask): Promise<number[][]> {
    return localEmbeddings(texts);
  }

  private async post(settings: GroqSettings, body: unknown, signal?: AbortSignal): Promise<Response> {
    const timeout = AbortSignal.timeout(settings.timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.groqApiKey}` },
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
    if (response.status === 400 || response.status === 422) throw new LlmError('bad_response', `Bad request. ${detail}`);
    throw new LlmError('unavailable', `The model answered ${response.status}. ${detail}`);
  }
}
