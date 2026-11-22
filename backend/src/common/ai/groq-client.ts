import { AiProviderError } from './ai-provider-error.js';

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * One authenticated call to Groq's OpenAI-compatible API. Network failures,
 * timeouts, 429 and other error statuses become an AiProviderError whose
 * message is a fixed sentence: it never holds the key or what was sent.
 */
export async function groqPost(
  apiKey: string,
  timeoutMs: number,
  path: string,
  body: BodyInit,
  headers: Record<string, string> = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${GROQ_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, ...headers },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new AiProviderError(
      timedOut ? 'timeout' : 'unavailable',
      timedOut ? 'The AI service did not answer in time.' : 'The AI service is unreachable.',
    );
  }

  if (response.status === 429) {
    throw new AiProviderError('rate_limited', 'The AI quota is used up for now.');
  }
  if (!response.ok) {
    throw new AiProviderError(
      'unavailable',
      `The AI service answered with status ${response.status}.`,
    );
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new AiProviderError('bad_response', 'The answer is not JSON.');
  }
}

/** Reads the JSON object a chat completion returned in JSON mode. */
export function parseChatJson(body: unknown): unknown {
  const content = (
    body as { choices?: { message?: { content?: unknown } }[] }
  )?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new AiProviderError('bad_response', 'Empty model answer.');
  }
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new AiProviderError('bad_response', 'The answer is not JSON.');
  }
}
