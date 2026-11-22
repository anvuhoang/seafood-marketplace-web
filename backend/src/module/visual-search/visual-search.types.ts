export { AiProviderError, type AiFailureKind } from '../../common/ai/ai-provider-error.js';

export interface SpeciesOption {
  slug: string;
  commonName: string;
  scientificName: string | null;
}

export interface CategoryOption {
  slug: string;
  name: string;
}

/** What the model may choose from, so it names real species and categories instead of inventing them. */
export interface RecognitionContext {
  species: SpeciesOption[];
  categories: CategoryOption[];
}

export interface RecognitionImage {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Looks at a photo and returns the model's raw JSON. The result is untrusted:
 * it is checked and normalised before anything is shown.
 */
export interface SeafoodRecognizer {
  recognize(image: RecognitionImage, context: RecognitionContext): Promise<unknown>;
}

/** Nest injection token, so the provider can be swapped (or mocked in tests) in one place. */
export const SEAFOOD_RECOGNIZER = Symbol('SEAFOOD_RECOGNIZER');
