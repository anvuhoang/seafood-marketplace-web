import { foldVietnamese } from '../chat/text.js';

/**
 * Raise this when the mapping or the document changes: the API then builds a new index at start-up instead of
 * trusting the old one.
 */
export const PRODUCT_INDEX_VERSION = 2;

/** What is searched about a product. Price, stock and the other filters are not here: the shop applies them itself. */
export interface ProductDocument {
  id: string;
  slug: string;
  name: string;
  species: string;
  scientific: string;
  categories: string[];
  vendors: string[];
  places: string[];
  description: string;
}

export interface IndexableProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  species: { commonName: string; scientificName: string | null } | null;
  categoryIds: string[];
  /** Where the product is sold from: one entry per offer that can be bought. */
  offers: Array<{ vendorName: string; district: string; province: string }>;
}

export interface IndexableCategory {
  id: string;
  name: string;
  parentId: string | null;
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

/** A product's own categories and the parents of those, like the shop's listing does. */
export function toDocument(product: IndexableProduct, categories: Map<string, IndexableCategory>): ProductDocument {
  const names: string[] = [];
  for (const id of product.categoryIds) {
    const category = categories.get(id);
    if (!category) continue;
    names.push(category.name);
    const parent = category.parentId ? categories.get(category.parentId) : undefined;
    if (parent) names.push(parent.name);
  }
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    species: product.species?.commonName ?? '',
    scientific: product.species?.scientificName ?? '',
    categories: unique(names),
    vendors: unique(product.offers.map((offer) => offer.vendorName)),
    places: unique(product.offers.flatMap((offer) => [offer.district, offer.province])),
    description: product.description ?? '',
  };
}

/**
 * Text is lower-cased and folded to plain letters ("Tôm Hùm" and "tom hum" are the same words, "đ" is "d"),
 * which asks for no plugin. `name.ngram` also keeps the first 1 to 15 letters of every word, which is what
 * finds a name while it is still being typed ("tom h" finds "Tôm Hùm").
 */
export const PRODUCT_INDEX_BODY = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      filter: {
        word_start: { type: 'edge_ngram', min_gram: 1, max_gram: 15 },
      },
      analyzer: {
        vi_fold: { type: 'custom', tokenizer: 'standard', filter: ['lowercase', 'asciifolding'] },
        vi_word_start: { type: 'custom', tokenizer: 'standard', filter: ['lowercase', 'asciifolding', 'word_start'] },
      },
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      slug: { type: 'keyword' },
      name: {
        type: 'text',
        analyzer: 'vi_fold',
        fields: { ngram: { type: 'text', analyzer: 'vi_word_start', search_analyzer: 'vi_fold' } },
      },
      species: { type: 'text', analyzer: 'vi_fold' },
      scientific: { type: 'text', analyzer: 'vi_fold' },
      categories: { type: 'text', analyzer: 'vi_fold' },
      vendors: { type: 'text', analyzer: 'vi_fold' },
      places: { type: 'text', analyzer: 'vi_fold' },
      description: { type: 'text', analyzer: 'vi_fold' },
    },
  },
} as const;

/**
 * Every word of the query must be found, in any field (so "tom phu quoc" can find a prawn sold from Phú Quốc), a name
 * counting most. A slip is only forgiven in the name and the species: a word of 3 to 5 letters may be one letter off
 * and a longer one two ("tom hun" finds "Tôm Hùm"), the first letter being right. Allowing it everywhere let short
 * words match unrelated descriptions ("hum" for "hầm"). A word typed only halfway ("tom hu") also finds a name.
 */
export function buildSearchQuery(text: string, size: number) {
  return {
    size,
    _source: false,
    track_total_hits: false,
    query: {
      bool: {
        should: [
          {
            multi_match: {
              query: text,
              type: 'cross_fields',
              operator: 'and',
              fields: ['name^4', 'species^3', 'scientific', 'categories^2', 'vendors', 'places', 'description^0.5'],
              boost: 2,
            },
          },
          {
            multi_match: {
              query: text,
              type: 'best_fields',
              operator: 'and',
              fields: ['name^4', 'species^3'],
              fuzziness: 'AUTO',
              prefix_length: 1,
            },
          },
          { match: { 'name.ngram': { query: text, operator: 'and', boost: 1.5 } } },
        ],
        minimum_should_match: 1,
      },
    },
  };
}

/** Names that begin like what was typed so far, every typed word being the start of a word of the name. */
export function buildSuggestQuery(prefix: string, size: number) {
  return {
    size,
    _source: ['name', 'slug'],
    track_total_hits: false,
    query: {
      bool: {
        should: [
          { match: { 'name.ngram': { query: prefix, operator: 'and', boost: 3 } } },
          // A slip in a longer word still finds the name, but ranks below one that starts the same.
          { match: { name: { query: prefix, operator: 'and', fuzziness: 'AUTO', prefix_length: 1 } } },
        ],
        minimum_should_match: 1,
      },
    },
  };
}

/** The text a visitor typed, cleaned: control characters out, shortened, empty becomes null. */
export function cleanQuery(raw: string | undefined, max = 100): string | null {
  const text = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  return foldVietnamese(text).replace(/[^a-z0-9]/g, '') === '' ? null : text;
}
