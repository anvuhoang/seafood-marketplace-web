import {
  AiProviderError,
  type CategoryOption,
  type RecognitionContext,
  type SpeciesOption,
} from './visual-search.types.js';

/**
 * Confidence bands. The number is how sure the model says it is, judged by the
 * model itself: it is not a calibrated probability, so the UI shows the band
 * ("Khá chắc chắn" / "Có thể là" / "Chưa chắc chắn") first and the number small.
 */
export const CONFIDENCE_HIGH = 0.75;
export const CONFIDENCE_MEDIUM = 0.5;

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_HIGH) return 'high';
  if (confidence >= CONFIDENCE_MEDIUM) return 'medium';
  return 'low';
}

export const IMAGE_QUALITIES = ['good', 'blurry', 'dark', 'too_far', 'multiple_items'] as const;
export type ImageQuality = (typeof IMAGE_QUALITIES)[number];

export const MAX_FEATURES = 3;
export const FEATURE_MAX_LENGTH = 60;
export const MAX_ALTERNATIVES = 2;
export const LABEL_MAX_LENGTH = 80;

export interface NormalizedAlternative {
  species: SpeciesOption;
  confidence: number;
}

export interface NormalizedPrediction {
  isSeafood: boolean;
  imageQuality: ImageQuality;
  /** Only a species from the list sent to the model. */
  species: SpeciesOption | null;
  /** Only a category from the list sent to the model. */
  category: CategoryOption | null;
  /** The species' name from the database when known, otherwise the model's short label. */
  label: string | null;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  features: string[];
  alternatives: NormalizedAlternative[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** A short single-line text, or null when it is not a usable string. */
function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  if (text === '') return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

/**
 * Checks the model's answer against what we asked for. Anything outside the
 * lists we sent is dropped, numbers are clamped and lists are cut, so a wrong
 * or manipulated answer can never point at a product that was not offered.
 * An answer missing the core fields is treated as unreadable.
 */
export function normalizePrediction(
  raw: unknown,
  context: RecognitionContext,
): NormalizedPrediction {
  if (!isRecord(raw)) {
    throw new AiProviderError('bad_response', 'The answer is not an object.');
  }
  if (typeof raw.isSeafood !== 'boolean') {
    throw new AiProviderError('bad_response', 'isSeafood is missing.');
  }
  if (typeof raw.confidence !== 'number' || !Number.isFinite(raw.confidence)) {
    throw new AiProviderError('bad_response', 'confidence is missing.');
  }

  const confidence = clamp01(raw.confidence);
  const imageQuality = IMAGE_QUALITIES.includes(raw.imageQuality as ImageQuality)
    ? (raw.imageQuality as ImageQuality)
    : 'good';

  if (!raw.isSeafood) {
    return {
      isSeafood: false,
      imageQuality,
      species: null,
      category: null,
      label: null,
      confidence,
      confidenceLevel: confidenceLevel(confidence),
      features: [],
      alternatives: [],
    };
  }

  const speciesBySlug = new Map(context.species.map((species) => [species.slug, species]));
  const species =
    typeof raw.speciesSlug === 'string' ? (speciesBySlug.get(raw.speciesSlug) ?? null) : null;
  const category =
    typeof raw.categorySlug === 'string'
      ? (context.categories.find((option) => option.slug === raw.categorySlug) ?? null)
      : null;

  const features = Array.isArray(raw.features)
    ? raw.features
        .map((feature) => cleanText(feature, FEATURE_MAX_LENGTH))
        .filter((feature): feature is string => feature !== null)
        .slice(0, MAX_FEATURES)
    : [];

  const seen = new Set(species ? [species.slug] : []);
  const alternatives: NormalizedAlternative[] = [];
  for (const item of Array.isArray(raw.alternatives) ? raw.alternatives : []) {
    if (alternatives.length >= MAX_ALTERNATIVES) break;
    if (!isRecord(item) || typeof item.speciesSlug !== 'string') continue;
    const option = speciesBySlug.get(item.speciesSlug);
    if (!option || seen.has(option.slug)) continue;
    seen.add(option.slug);
    const itemConfidence =
      typeof item.confidence === 'number' && Number.isFinite(item.confidence)
        ? clamp01(item.confidence)
        : 0;
    alternatives.push({ species: option, confidence: itemConfidence });
  }

  return {
    isSeafood: true,
    imageQuality,
    species,
    category,
    label: species?.commonName ?? cleanText(raw.label, LABEL_MAX_LENGTH) ?? category?.name ?? null,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    features,
    alternatives,
  };
}
