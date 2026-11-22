// Shared with Visual Search; re-exported so existing imports keep working.
export { AiProviderError, type AiFailureKind } from '../../common/ai/ai-provider-error.js';

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
