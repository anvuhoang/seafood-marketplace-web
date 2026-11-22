/**
 * What the chat needs from a language model, whoever provides it. The orchestrator only knows these
 * types, so changing Gemini for another model means writing one more class that implements LlmProvider.
 */

/** A function the model may ask us to run. `parameters` is a JSON schema (an object with properties). */
export interface LlmToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** The model asking for a tool to be run. */
export interface LlmToolCall {
  /** Ties the answer to the call. Providers that give no id get one made up. */
  id: string;
  name: string;
  args: Record<string, unknown>;
  /** The provider's own form of the call, sent back as it came (some models need hidden fields echoed). */
  raw?: unknown;
}

export interface LlmToolResult {
  id: string;
  name: string;
  result: unknown;
}

export type LlmMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; toolCalls?: LlmToolCall[] }
  | { role: 'tool'; results: LlmToolResult[] };

export interface LlmRequest {
  /** Instructions that rule the whole conversation. */
  system: string;
  messages: LlmMessage[];
  tools: LlmToolDeclaration[];
  maxOutputTokens: number;
  /** Aborts the call, for example when the visitor closes the chat. */
  signal?: AbortSignal;
}

/** One piece of the answer, as soon as the model produces it. */
export type LlmChunk =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; call: LlmToolCall }
  /** Sent once, at the end of a call: what the call cost in tokens (the model's reading and writing). */
  | { type: 'usage'; inputTokens: number; outputTokens: number };

export type LlmTask = 'document' | 'query';

export interface LlmProvider {
  /** Streams the model's answer: text pieces, and any tools it wants run. */
  generate(request: LlmRequest): AsyncIterable<LlmChunk>;
  /** Turns texts into vectors for similarity search. `task` says whether they are passages or questions. */
  embed(texts: string[], task: LlmTask): Promise<number[][]>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export type LlmErrorCode =
  | 'unavailable'
  | 'rate_limited'
  | 'timeout'
  | 'blocked'
  | 'bad_response';

/** Anything that went wrong while talking to the model. The message is for the logs, not for the visitor. */
export class LlmError extends Error {
  constructor(
    readonly code: LlmErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}
