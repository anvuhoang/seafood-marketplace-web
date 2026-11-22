import { describe, expect, it } from 'vitest';
import {
  CONFIDENCE_HIGH,
  CONFIDENCE_MEDIUM,
  FEATURE_MAX_LENGTH,
  MAX_ALTERNATIVES,
  MAX_FEATURES,
  confidenceLevel,
  normalizePrediction,
} from './normalize-prediction.js';
import { AiProviderError, type RecognitionContext } from './visual-search.types.js';

const CONTEXT: RecognitionContext = {
  species: [
    { slug: 'tom-su', commonName: 'Tôm sú', scientificName: 'Penaeus monodon' },
    { slug: 'tom-the', commonName: 'Tôm thẻ chân trắng', scientificName: 'Litopenaeus vannamei' },
    { slug: 'tom-hum', commonName: 'Tôm hùm bông', scientificName: null },
    { slug: 'cua-bun', commonName: 'Cua bùn', scientificName: null },
  ],
  categories: [{ slug: 'tom-song', name: 'Tôm sống' }],
};

const answer = (extra: Record<string, unknown> = {}) => ({
  isSeafood: true,
  imageQuality: 'good',
  speciesSlug: 'tom-su',
  categorySlug: 'tom-song',
  label: 'Tôm sú biển',
  confidence: 0.82,
  features: ['Vằn đen ngang thân'],
  alternatives: [{ speciesSlug: 'tom-the', confidence: 0.1 }],
  ...extra,
});

const kindOf = (raw: unknown) => {
  try {
    normalizePrediction(raw, CONTEXT);
    return null;
  } catch (error) {
    return error instanceof AiProviderError ? error.kind : 'other';
  }
};

describe('normalizePrediction', () => {
  it('keeps a valid answer and takes the label from the database', () => {
    const result = normalizePrediction(answer(), CONTEXT);
    expect(result).toMatchObject({
      isSeafood: true,
      species: { slug: 'tom-su', commonName: 'Tôm sú' },
      category: { slug: 'tom-song' },
      label: 'Tôm sú',
      confidence: 0.82,
      confidenceLevel: 'high',
      features: ['Vằn đen ngang thân'],
    });
    expect(result.alternatives).toEqual([
      { species: CONTEXT.species[1], confidence: 0.1 },
    ]);
  });

  it('drops slugs that were not in the lists sent to the model', () => {
    const result = normalizePrediction(
      answer({
        speciesSlug: 'ca-map-trang',
        categorySlug: 'vu-khi',
        label: 'Cá mập trắng',
        alternatives: [{ speciesSlug: 'made-up', confidence: 0.4 }, { speciesSlug: 'cua-bun', confidence: 0.2 }],
      }),
      CONTEXT,
    );
    expect(result.species).toBeNull();
    expect(result.category).toBeNull();
    expect(result.label).toBe('Cá mập trắng');
    expect(result.alternatives.map((a) => a.species.slug)).toEqual(['cua-bun']);
  });

  it('falls back to the category name when there is no species or label', () => {
    const result = normalizePrediction(answer({ speciesSlug: null, label: null }), CONTEXT);
    expect(result.label).toBe('Tôm sống');
  });

  it.each([
    [1.7, 1],
    [-0.3, 0],
  ])('clamps confidence %s to %s', (raw, expected) => {
    expect(normalizePrediction(answer({ confidence: raw }), CONTEXT).confidence).toBe(expected);
  });

  it('cuts features and alternatives and shortens long features', () => {
    const result = normalizePrediction(
      answer({
        features: ['a'.repeat(200), 'b', 42, 'c', 'd', 'e'],
        alternatives: [
          { speciesSlug: 'tom-su', confidence: 0.9 },
          { speciesSlug: 'tom-the', confidence: 5 },
          { speciesSlug: 'tom-the', confidence: 0.1 },
          { speciesSlug: 'tom-hum', confidence: 0.1 },
          { speciesSlug: 'cua-bun', confidence: 0.1 },
        ],
      }),
      CONTEXT,
    );
    expect(result.features).toHaveLength(MAX_FEATURES);
    expect(result.features[0].length).toBeLessThanOrEqual(FEATURE_MAX_LENGTH);
    expect(result.features.slice(1)).toEqual(['b', 'c']);
    // The main species and duplicates are not repeated; confidence is clamped.
    expect(result.alternatives).toHaveLength(MAX_ALTERNATIVES);
    expect(result.alternatives.map((a) => a.species.slug)).toEqual(['tom-the', 'tom-hum']);
    expect(result.alternatives[0].confidence).toBe(1);
  });

  it('clears everything when the photo is not seafood', () => {
    const result = normalizePrediction(answer({ isSeafood: false }), CONTEXT);
    expect(result).toMatchObject({ isSeafood: false, species: null, label: null, features: [], alternatives: [] });
  });

  it('treats an unknown image quality as good', () => {
    expect(normalizePrediction(answer({ imageQuality: 'sparkly' }), CONTEXT).imageQuality).toBe('good');
    expect(normalizePrediction(answer({ imageQuality: 'dark' }), CONTEXT).imageQuality).toBe('dark');
  });

  it.each([
    ['not an object', 'tôm sú'],
    ['an array', [answer()]],
    ['null', null],
    ['missing isSeafood', answer({ isSeafood: undefined })],
    ['isSeafood as text', answer({ isSeafood: 'yes' })],
    ['missing confidence', answer({ confidence: undefined })],
    ['confidence as text', answer({ confidence: '0.9' })],
    ['confidence NaN', answer({ confidence: Number.NaN })],
  ])('reports %s as bad_response', (_label, raw) => {
    expect(kindOf(raw)).toBe('bad_response');
  });
});

describe('confidenceLevel', () => {
  it('uses the named thresholds', () => {
    expect(confidenceLevel(CONFIDENCE_HIGH)).toBe('high');
    expect(confidenceLevel(CONFIDENCE_HIGH - 0.01)).toBe('medium');
    expect(confidenceLevel(CONFIDENCE_MEDIUM)).toBe('medium');
    expect(confidenceLevel(CONFIDENCE_MEDIUM - 0.01)).toBe('low');
    expect(confidenceLevel(0)).toBe('low');
  });
});
