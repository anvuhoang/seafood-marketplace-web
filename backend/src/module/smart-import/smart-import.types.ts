/** Why a call to the AI provider failed; each kind maps to one clear message for the vendor. */
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

/** Turns a short voice recording into text. */
export interface SpeechToText {
  transcribe(audio: Buffer, filename: string, mimeType: string): Promise<string>;
}

/** What the model may choose from, so it names real categories instead of inventing them. */
export interface ExtractionContext {
  categories: { id: string; name: string }[];
}

/**
 * Reads a vendor's description and returns the model's raw JSON. The result is
 * untrusted: it is checked and normalised before anything is shown or saved.
 */
export interface DraftExtractor {
  extract(text: string, context: ExtractionContext): Promise<unknown>;
}

/** Nest injection tokens for the two roles, so a provider can be swapped in one place. */
export const SPEECH_TO_TEXT = Symbol('SPEECH_TO_TEXT');
export const DRAFT_EXTRACTOR = Symbol('DRAFT_EXTRACTOR');
