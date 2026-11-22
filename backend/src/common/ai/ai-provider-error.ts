/** Why a call to the AI provider failed; each kind maps to one clear message for the user. */
export type AiFailureKind =
  /** No key configured, or the provider rejected it. */
  | 'unavailable'
  /** The provider's free quota is used up for now. */
  | 'rate_limited'
  /** No answer in time. */
  | 'timeout'
  /** An answer came back but it is empty or not the JSON we asked for. */
  | 'bad_response';

export class AiProviderError extends Error {
  constructor(
    readonly kind: AiFailureKind,
    message: string,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
