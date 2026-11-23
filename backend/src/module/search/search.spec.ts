import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real package cannot be loaded in this test pool; these classes only need its name here.
vi.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import type { ConfigService } from '@nestjs/config';
import { CacheService } from '../../infra/cache.service.js';
import { MemoryKeyValueStore } from '../../infra/kv-store.js';
import { CategoryService } from '../category/category.service.js';
import { ProductListingService } from '../product/product-listing.service.js';
import { ProductIndexerService } from './product-indexer.service.js';
import {
  PRODUCT_INDEX_BODY,
  PRODUCT_INDEX_VERSION,
  buildSearchQuery,
  buildSuggestQuery,
  cleanQuery,
  toDocument,
  type IndexableCategory,
} from './product-index.js';
import { ProductSearchService } from './product-search.service.js';

const config = (search: Record<string, unknown> = {}) =>
  ({ get: (key: string) => (key === 'search' ? { url: 'http://es:9200', index: 'haisan-products', timeoutMs: 1500, maxResults: 300, ...search } : undefined) }) as unknown as ConfigService;

/** Just the calls of the Elasticsearch client that the shop makes. */
function fakeEs() {
  return {
    search: vi.fn(),
    bulk: vi.fn(async () => ({ errors: false })),
    count: vi.fn(async () => ({ count: 7 })),
    indices: {
      create: vi.fn(async () => ({})),
      refresh: vi.fn(async () => ({})),
      getAlias: vi.fn(async () => Promise.reject(Object.assign(new Error('missing'), { meta: { statusCode: 404 } }))),
      updateAliases: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    },
    cat: { indices: vi.fn(async () => []) },
  };
}
type FakeEs = ReturnType<typeof fakeEs>;

const hits = (...items: Array<{ id: string; score?: number; source?: unknown }>) => ({
  hits: { hits: items.map((item) => ({ _id: item.id, _score: item.score ?? 1, _source: item.source })) },
});

// ----- the document and the queries ------------------------------------------------------------------------------

describe('toDocument', () => {
  const categories = new Map<string, IndexableCategory>([
    ['c-tom', { id: 'c-tom', name: 'Tôm sống', parentId: 'c-hai-san' }],
    ['c-hai-san', { id: 'c-hai-san', name: 'Hải sản', parentId: null }],
  ]);

  it('holds what is searched about a product, with the parent categories and without repeats', () => {
    const document = toDocument(
      {
        id: 'p1',
        slug: 'tom-su',
        name: 'Tôm sú biển',
        description: 'Tươi sống',
        species: { commonName: 'Tôm sú', scientificName: 'Penaeus monodon' },
        categoryIds: ['c-tom', 'c-tom', 'unknown'],
        offers: [
          { vendorName: 'Vựa A', district: 'Phú Quốc', province: 'Kiên Giang' },
          { vendorName: 'Vựa A', district: 'Phú Quốc', province: 'Kiên Giang' },
          { vendorName: 'Vựa B', district: 'Năm Căn', province: 'Cà Mau' },
        ],
      },
      categories,
    );

    expect(document).toEqual({
      id: 'p1',
      slug: 'tom-su',
      name: 'Tôm sú biển',
      species: 'Tôm sú',
      scientific: 'Penaeus monodon',
      categories: ['Tôm sống', 'Hải sản'],
      vendors: ['Vựa A', 'Vựa B'],
      places: ['Phú Quốc', 'Kiên Giang', 'Năm Căn', 'Cà Mau'],
      description: 'Tươi sống',
    });
  });

  it('copes with a product that has no species, description or offers', () => {
    expect(toDocument({ id: 'p', slug: 's', name: 'N', description: null, species: null, categoryIds: [], offers: [] }, categories)).toMatchObject({
      species: '',
      scientific: '',
      description: '',
      categories: [],
      vendors: [],
      places: [],
    });
  });
});

describe('the index and its queries', () => {
  it('folds accents and keeps the start of every word of a name', () => {
    const analysis = PRODUCT_INDEX_BODY.settings.analysis;
    expect(analysis.analyzer.vi_fold.filter).toEqual(['lowercase', 'asciifolding']);
    expect(analysis.analyzer.vi_word_start.filter).toContain('word_start');
    expect(analysis.filter.word_start).toMatchObject({ type: 'edge_ngram', min_gram: 1 });
    expect(PRODUCT_INDEX_BODY.mappings.properties.name.fields.ngram.search_analyzer).toBe('vi_fold');
    // Only the listed fields are indexed, so a new column never changes the index by accident.
    expect(PRODUCT_INDEX_BODY.mappings.dynamic).toBe(false);
    expect(PRODUCT_INDEX_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('wants every word in some field, forgives a slip only in the name and the species, and finds a half-typed word', () => {
    const { query, size } = buildSearchQuery('tom hum', 300);
    expect(size).toBe(300);
    const [exact, fuzzy, halfTyped] = query.bool.should as unknown as Array<Record<string, Record<string, unknown>>>;

    expect(exact.multi_match).toMatchObject({ query: 'tom hum', type: 'cross_fields', operator: 'and' });
    expect(exact.multi_match.fields).toEqual(expect.arrayContaining(['name^4', 'species^3', 'categories^2', 'vendors', 'places']));
    expect(exact.multi_match.fuzziness).toBeUndefined();

    expect(fuzzy.multi_match).toMatchObject({ fuzziness: 'AUTO', prefix_length: 1, operator: 'and', fields: ['name^4', 'species^3'] });
    expect(halfTyped.match['name.ngram']).toMatchObject({ query: 'tom hum', operator: 'and' });
    expect(query.bool.minimum_should_match).toBe(1);
  });

  it('suggests names that start like what was typed', () => {
    const { query, _source } = buildSuggestQuery('tom h', 16);
    expect(_source).toEqual(['name', 'slug']);
    expect(query.bool.should[0]).toEqual({ match: { 'name.ngram': { query: 'tom h', operator: 'and', boost: 3 } } });
  });

  it('cleans what a visitor typed', () => {
    expect(cleanQuery('  tôm   hùm  ')).toBe('tôm hùm');
    expect(cleanQuery('a'.repeat(300))?.length).toBe(100);
    expect(cleanQuery('   ')).toBeNull();
    expect(cleanQuery('!!! ???')).toBeNull();
    expect(cleanQuery(undefined)).toBeNull();
  });
});

// ----- searching -------------------------------------------------------------------------------------------------

describe('ProductSearchService', () => {
  it('answers the best matches in order, asking the alias for as many as are wanted', async () => {
    const es = fakeEs();
    es.search.mockResolvedValue(hits({ id: 'b', score: 9 }, { id: 'a', score: 4 }));
    const service = new ProductSearchService(es as never, config({ maxResults: 50 }));

    const ranked = await service.search('tom hum');

    expect([...ranked!.entries()]).toEqual([['b', 9], ['a', 4]]);
    // Every call has a hard time limit: a connection that never answers must not hold a visitor up.
    expect(es.search).toHaveBeenCalledWith(expect.objectContaining({ index: 'haisan-products', size: 50 }), { signal: expect.any(AbortSignal) });
  });

  it('says "search another way" (null) when there is no engine, or nothing to search', async () => {
    expect(await new ProductSearchService(null, config()).search('tom')).toBeNull();
    expect(new ProductSearchService(null, config()).enabled).toBe(false);

    const es = fakeEs();
    const service = new ProductSearchService(es as never, config());
    expect(await service.search('   ')).toBeNull();
    expect(await service.suggest('!!')).toBeNull();
    expect(es.search).not.toHaveBeenCalled();
  });

  it('says "search another way" (null) when the engine fails, and when its index does not exist yet', async () => {
    const down = fakeEs();
    down.search.mockRejectedValue(new Error('timeout'));
    const failing = new ProductSearchService(down as never, config());
    expect(await failing.search('tom')).toBeNull();

    const noIndex = fakeEs();
    noIndex.search.mockRejectedValue(Object.assign(new Error('no such index'), { meta: { statusCode: 404 } }));
    expect(await new ProductSearchService(noIndex as never, config()).suggest('tom')).toBeNull();
  });

  it('gives up after the time limit even when the engine never answers (a name that does not resolve)', async () => {
    vi.useFakeTimers();
    try {
      const es = fakeEs();
      es.search.mockReturnValue(new Promise(() => undefined));
      const service = new ProductSearchService(es as never, config({ timeoutMs: 1500 }));

      const answer = service.search('tom');
      await vi.advanceTimersByTimeAsync(1499);
      let settled = false;
      void answer.then(() => (settled = true));
      await Promise.resolve();
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(2);
      expect(await answer).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  describe('the circuit breaker', () => {
    afterEach(() => vi.useRealTimers());

    it('leaves the engine alone for a while after it failed, so only the first visitor waits', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-23T08:00:00Z'));
      const es = fakeEs();
      es.search.mockRejectedValue(new Error('getaddrinfo ENOTFOUND elasticsearch'));
      const service = new ProductSearchService(es as never, config());

      expect(await service.search('tom')).toBeNull();
      expect(es.search).toHaveBeenCalledTimes(1);

      // The next visitors are answered at once, without calling the engine at all (search and suggestions alike).
      for (let i = 0; i < 5; i++) expect(await service.search('tom')).toBeNull();
      expect(await service.suggest('tom')).toBeNull();
      expect(es.search).toHaveBeenCalledTimes(1);

      // After the pause the engine is tried again, and a working engine is used again.
      vi.setSystemTime(new Date('2026-11-23T08:00:16Z'));
      es.search.mockResolvedValue(hits({ id: 'a', score: 2 }));
      expect([...(await service.search('tom'))!.keys()]).toEqual(['a']);
      expect(es.search).toHaveBeenCalledTimes(2);
    });

    it('retries sooner when the index is only missing (right after a deploy)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-23T08:00:00Z'));
      const es = fakeEs();
      es.search.mockRejectedValueOnce(Object.assign(new Error('no such index'), { meta: { statusCode: 404 } }));
      const service = new ProductSearchService(es as never, config());

      expect(await service.search('tom')).toBeNull();
      expect(await service.search('tom')).toBeNull();
      expect(es.search).toHaveBeenCalledTimes(1);

      vi.setSystemTime(new Date('2026-11-23T08:00:04Z'));
      es.search.mockResolvedValue(hits({ id: 'a' }));
      expect(await service.search('tom')).not.toBeNull();
    });
  });

  it('suggests each name once, at most the number asked for', async () => {
    const es = fakeEs();
    es.search.mockResolvedValue(
      hits(
        { id: '1', source: { name: 'Tôm Hùm', slug: 'tom-hum' } },
        { id: '2', source: { name: 'Tôm Hùm', slug: 'tom-hum-2' } },
        { id: '3', source: { name: 'Tôm Sú', slug: 'tom-su' } },
        { id: '4', source: { name: 'Tôm Thẻ', slug: 'tom-the' } },
        { id: '5', source: { slug: 'broken' } },
      ),
    );
    const suggestions = await new ProductSearchService(es as never, config()).suggest('tom', 2);
    expect(suggestions).toEqual([
      { name: 'Tôm Hùm', slug: 'tom-hum' },
      { name: 'Tôm Sú', slug: 'tom-su' },
    ]);
  });
});

// ----- keeping the index up to date ------------------------------------------------------------------------------

/** The options every request of an index build carries (a build is slow; a search is not). */
const LONG_REQUEST = { requestTimeout: 60_000 };

describe('ProductIndexerService', () => {
  const sellable = [
    {
      id: 'p1',
      slug: 'tom-su',
      name: 'Tôm sú',
      description: null,
      species: { commonName: 'Tôm sú', scientificName: null },
      categories: [{ categoryId: 'c1' }],
      variants: [{ offers: [{ vendor: { name: 'Vựa A', district: 'Phú Quốc', province: 'Kiên Giang' } }] }],
    },
    {
      id: 'p2',
      slug: 'cua',
      name: 'Cua',
      description: 'Cua gạch',
      species: null,
      categories: [],
      variants: [],
    },
  ];

  let es: FakeEs;
  let store: MemoryKeyValueStore;
  let cache: CacheService;
  let prisma: { product: { findMany: ReturnType<typeof vi.fn> }; category: { findMany: ReturnType<typeof vi.fn> } };

  const build = (client: FakeEs | null = es) => new ProductIndexerService(prisma as never, client as never, config(), store, cache);

  beforeEach(() => {
    es = fakeEs();
    store = new MemoryKeyValueStore();
    cache = new CacheService(store, { get: () => ({ enabled: true }) } as unknown as ConfigService);
    prisma = {
      product: { findMany: vi.fn(async () => sellable) },
      category: { findMany: vi.fn(async () => [{ id: 'c1', name: 'Tôm sống', parentId: null }]) },
    };
  });

  afterEach(() => vi.useRealTimers());

  it('builds a new index, fills it, and moves the alias to it in one step', async () => {
    es.indices.getAlias.mockResolvedValue({ 'haisan-products-v1-111': { aliases: { 'haisan-products': {} } } } as never);
    es.cat.indices.mockResolvedValue([{ index: 'haisan-products-v1-111' }, { index: 'haisan-products-v1-orphan' }] as never);

    const result = await build().reindex();

    expect(result).toMatchObject({ ran: true, documents: 2 });
    const created = (es.indices.create.mock.calls[0] as unknown as [{ index: string }])[0];
    expect(created.index).toMatch(new RegExp(`^haisan-products-v${PRODUCT_INDEX_VERSION}-\\d+$`));
    expect(created).toMatchObject({ settings: expect.anything(), mappings: expect.anything() });

    const operations = (es.bulk.mock.calls[0] as unknown as [{ operations: unknown[] }])[0].operations;
    expect(operations[0]).toEqual({ index: { _index: created.index, _id: 'p1' } });
    expect(operations[1]).toMatchObject({ id: 'p1', name: 'Tôm sú', categories: ['Tôm sống'], vendors: ['Vựa A'] });
    expect(operations).toHaveLength(4);

    expect(es.indices.refresh).toHaveBeenCalledWith({ index: created.index }, LONG_REQUEST);
    expect(es.indices.updateAliases).toHaveBeenCalledWith(
      { actions: [{ remove: { index: 'haisan-products-v1-111', alias: 'haisan-products' } }, { add: { index: created.index, alias: 'haisan-products' } }] },
      LONG_REQUEST,
    );
    // Building is slow work: none of its requests may use the short search timeout.
    expect(es.indices.create).toHaveBeenCalledWith(expect.anything(), LONG_REQUEST);
    expect(es.bulk).toHaveBeenCalledWith(expect.anything(), LONG_REQUEST);
    // Every older index of the family goes, the new one stays.
    const deleted = es.indices.delete.mock.calls.map((call) => ((call as unknown[])[0] as { index: string }).index);
    expect(deleted.sort()).toEqual(['haisan-products-v1-111', 'haisan-products-v1-orphan']);
  });

  it('never removes an index that is newer than the one it just built, and never moves the alias back', async () => {
    const newer = `haisan-products-v1-${Date.now() + 60_000}`;
    es.indices.getAlias.mockResolvedValue({ [newer]: { aliases: { 'haisan-products': {} } } } as never);

    const result = await build().reindex();

    // A newer build is already live: this one is thrown away and the alias is left where it is.
    expect(result.ran).toBe(true);
    expect(result.index).toBeUndefined();
    expect(es.indices.updateAliases).not.toHaveBeenCalled();
    const deleted = es.indices.delete.mock.calls.map((call) => ((call as unknown[])[0] as { index: string }).index);
    expect(deleted).toEqual([(es.indices.create.mock.calls[0] as unknown as [{ index: string }])[0].index]);
    expect(deleted).not.toContain(newer);
  });

  it("only cleans up indices older than its own, so two builds at once cannot delete each other's", async () => {
    const newer = `haisan-products-v1-${Date.now() + 60_000}`;
    es.indices.getAlias.mockResolvedValue({} as never);
    es.cat.indices.mockResolvedValue([{ index: newer }, { index: 'haisan-products-v1-5' }] as never);

    await build().reindex();

    const deleted = es.indices.delete.mock.calls.map((call) => ((call as unknown[])[0] as { index: string }).index);
    expect(deleted).toEqual(['haisan-products-v1-5']);
  });

  it('waits for the shared store before it builds, so the lock can be taken', async () => {
    vi.useFakeTimers();
    es.indices.getAlias.mockRejectedValue(Object.assign(new Error('missing'), { meta: { statusCode: 404 } }));
    let ready = false;
    const slowStore = Object.assign(Object.create(store) as MemoryKeyValueStore, { ping: vi.fn(async () => ready) });
    const indexer = new ProductIndexerService(prisma as never, es as never, config(), slowStore, cache);

    indexer.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(1200);
    expect(es.indices.create).not.toHaveBeenCalled();
    expect(slowStore.ping.mock.calls.length).toBeGreaterThan(1);

    ready = true;
    await vi.advanceTimersByTimeAsync(600);
    expect(es.indices.create).toHaveBeenCalledTimes(1);
  });

  it('indexes only what customers can buy, and only the fields that are searched', async () => {
    await build().reindex();
    const query = (prisma.product.findMany.mock.calls[0] as unknown as [{ where: unknown }])[0].where;
    expect(query).toMatchObject({ status: 'ACTIVE' });
  });

  it('does nothing without an engine, and does not index twice at once, even from two API processes', async () => {
    expect(await build(null).reindex()).toEqual({ ran: false });

    let release: () => void = () => undefined;
    es.indices.create.mockImplementationOnce(() => new Promise<never>((resolve) => (release = () => resolve({} as never))));
    const first = build().reindex();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // A second process (same store, so the same lock) finds the work taken.
    expect(await build().reindex()).toEqual({ ran: false });
    release();
    expect((await first).ran).toBe(true);
    // The lock is let go when the work is done.
    expect((await build().reindex()).ran).toBe(true);
  });

  it('throws away the half-built index, lets the lock go, and keeps the old index in use when it fails', async () => {
    es.bulk.mockResolvedValueOnce({ errors: true } as never);
    await expect(build().reindex()).rejects.toThrow('refused');

    const created = (es.indices.create.mock.calls[0] as unknown as [{ index: string }])[0].index;
    expect(es.indices.delete).toHaveBeenCalledWith({ index: created }, { ...LONG_REQUEST, ignore: [404] });
    expect(es.indices.updateAliases).not.toHaveBeenCalled();
    expect((await build().reindex()).ran).toBe(true);
  });

  it('indexes a burst of changes once, shortly after the last one', async () => {
    vi.useFakeTimers();
    const indexer = build();
    indexer.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    es.bulk.mockClear();

    for (let i = 0; i < 5; i++) {
      await cache.invalidate('catalog:');
      await vi.advanceTimersByTimeAsync(500);
    }
    expect(es.indices.create).toHaveBeenCalledTimes(1); // only the start-up index so far
    await vi.advanceTimersByTimeAsync(2100);

    expect(es.indices.create).toHaveBeenCalledTimes(2);
  });

  it('ignores changes that are not about the catalogue', async () => {
    vi.useFakeTimers();
    build().onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    es.indices.create.mockClear();

    await cache.invalidate('other:');
    await vi.advanceTimersByTimeAsync(5000);
    expect(es.indices.create).not.toHaveBeenCalled();
  });

  it('builds the index at start-up only when there is none, or it is of an older version', async () => {
    vi.useFakeTimers();

    es.indices.getAlias.mockResolvedValue({ [`haisan-products-v${PRODUCT_INDEX_VERSION}-123`]: { aliases: {} } } as never);
    build().onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    expect(es.indices.create).not.toHaveBeenCalled();

    es.indices.getAlias.mockResolvedValue({ 'haisan-products-v0-123': { aliases: {} } } as never);
    build().onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    expect(es.indices.create).toHaveBeenCalledTimes(1);
  });

  it('does not start the engine work when asked to stay out (the reindex command does it itself)', async () => {
    process.env.SEARCH_SKIP_BOOTSTRAP = 'true';
    try {
      build().onApplicationBootstrap();
      await Promise.resolve();
      expect(es.indices.getAlias).not.toHaveBeenCalled();
    } finally {
      delete process.env.SEARCH_SKIP_BOOTSTRAP;
    }
  });

  it('tells the admin page whether search is off, answering, missing its index, or down', async () => {
    expect(await build(null).status()).toEqual({ enabled: false, state: 'off' });
    expect(await build().status()).toEqual({ enabled: true, state: 'ok', index: 'haisan-products', documents: 7 });
    es.count.mockRejectedValueOnce(Object.assign(new Error('x'), { meta: { statusCode: 404 } }));
    expect(await build().status()).toEqual({ enabled: true, state: 'no-index' });
    es.count.mockRejectedValueOnce(new Error('connection refused'));
    expect(await build().status()).toEqual({ enabled: true, state: 'down' });
  });
});

// ----- the shop's listing with and without the engine ------------------------------------------------------------

describe('product listing with search', () => {
  const categories = [{ id: 'c-tom', name: 'Tôm', slug: 'tom-song', description: null, imageUrl: null, parentId: null }];
  const vendor = { name: 'Vựa Phú Quốc', slug: 'vua-pq', district: 'Phú Quốc', province: 'Kiên Giang' };
  const product = (id: string, name: string, price: number, extra: { isFeatured?: boolean; createdAt?: string } = {}) => ({
    id,
    name,
    slug: id,
    description: null,
    isFeatured: extra.isFeatured ?? false,
    createdAt: new Date(extra.createdAt ?? '2026-01-01'),
    species: { commonName: name },
    images: [],
    categories: [{ categoryId: 'c-tom' }],
    variants: [{ unit: 'kg', offers: [{ id: `o-${id}`, price, stock: 5, vendor }] }],
  });

  const PRODUCTS = [
    product('su', 'Tôm sú biển', 420000, { isFeatured: true }),
    product('hum', 'Tôm hùm bông', 1390000),
    product('the', 'Tôm thẻ chân trắng', 230000),
    product('cua', 'Cua gạch', 580000),
  ];

  const prisma = () => ({ category: { findMany: vi.fn(async () => categories) }, product: { findMany: vi.fn(async () => PRODUCTS) } });

  function build(search: Partial<ProductSearchService> | undefined) {
    const db = prisma();
    return new ProductListingService(db as never, new CategoryService(db as never), undefined, search as never);
  }

  it('lists the products the engine names, best match first, whatever the typo', async () => {
    const search = { enabled: true, search: vi.fn(async () => new Map([['hum', 12], ['su', 3]])) };
    const result = await build(search).listProducts({ q: 'tom hun' });

    expect(search.search).toHaveBeenCalledWith('tom hun');
    expect(result.items.map((item) => item.id)).toEqual(['hum', 'su']);
    expect(result.pagination.totalItems).toBe(2);
  });

  it('keeps the other filters and the chosen order on top of the engine\'s matches', async () => {
    const search = { enabled: true, search: vi.fn(async () => new Map([['hum', 12], ['su', 3], ['the', 2], ['cua', 1]])) };
    const service = build(search);

    expect((await service.listProducts({ q: 'tom', sort: 'price-asc' })).items.map((item) => item.id)).toEqual(['the', 'su', 'cua', 'hum']);
    expect((await service.listProducts({ q: 'tom', maxPrice: 500000 })).items.map((item) => item.id)).toEqual(['su', 'the']);
    expect((await service.listProducts({ q: 'tom', category: 'tom-song' })).facets.categories).toEqual([{ value: 'tom-song', label: 'Tôm', count: 4 }]);
  });

  it('shows nothing when the engine finds nothing', async () => {
    const result = await build({ enabled: true, search: vi.fn(async () => new Map()) }).listProducts({ q: 'xyz' });
    expect(result.items).toEqual([]);
  });

  it('searches as before when the engine is off or does not answer', async () => {
    const down = { enabled: true, search: vi.fn(async () => null) };
    expect((await build(down).listProducts({ q: 'tom su' })).items.map((item) => item.id)).toEqual(['su']);

    const off = { enabled: false, search: vi.fn() };
    expect((await build(off).listProducts({ q: 'tom hum' })).items.map((item) => item.id)).toEqual(['hum']);
    expect(off.search).not.toHaveBeenCalled();

    expect((await build(undefined).listProducts({ q: 'cua' })).items.map((item) => item.id)).toEqual(['cua']);
  });

  it('does not ask the engine when there is nothing typed', async () => {
    const search = { enabled: true, search: vi.fn(async () => new Map()) };
    const result = await build(search).listProducts({});
    expect(search.search).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(4);
  });

  it('suggests names from the engine, or from the catalogue when the engine is off', async () => {
    const fromEngine = { enabled: true, suggest: vi.fn(async () => [{ name: 'Tôm Hùm', slug: 'tom-hum' }]) };
    expect(await build(fromEngine).suggest('tom h')).toEqual([{ name: 'Tôm Hùm', slug: 'tom-hum' }]);

    const fallback = build({ enabled: false });
    expect((await fallback.suggest('tom')).map((item) => item.slug)).toEqual(['su', 'hum', 'the']);
    expect((await fallback.suggest('TÔM H')).map((item) => item.slug)).toEqual(['hum']);
    expect(await fallback.suggest('   ')).toEqual([]);
    expect(await fallback.suggest('zzz')).toEqual([]);
    expect(await fallback.suggest('tom', 2)).toHaveLength(2);

    // The engine is on but does not answer: the catalogue answers.
    expect((await build({ enabled: true, suggest: vi.fn(async () => null) }).suggest('cua')).map((item) => item.slug)).toEqual(['cua']);
  });
});
