import type { CacheService } from './cache.service.js';

/** Everything cached about the catalogue starts with this, so one call forgets all of it. */
export const CATALOG_PREFIX = 'catalog:';
export const CATALOG_PRODUCTS_KEY = `${CATALOG_PREFIX}products`;
export const CATALOG_CATEGORIES_KEY = `${CATALOG_PREFIX}categories`;

/**
 * Forgets the cached catalogue after the decorated method has succeeded. Put it on the methods that change what
 * customers see in the product listing: products, offers, categories, and the vendors that sell them. The class
 * needs a `cache` property (an optional CacheService); without one the decorator does nothing, so a service built
 * without a cache (in a test) works as before.
 *
 * Stock that moves with orders is not covered on purpose: it would empty the cache on every sale. The listing
 * shows stock up to one cache lifetime late, and the cart and checkout read the real stock.
 *
 * @example
 * @InvalidatesCatalog()
 * async createOffer(...) { ... }
 */
export function InvalidatesCatalog(): MethodDecorator {
  return (_target, _key, descriptor) => {
    const original = descriptor.value as unknown as (...args: unknown[]) => unknown;
    descriptor.value = async function (this: { cache?: CacheService }, ...args: unknown[]) {
      const result = await original.apply(this, args);
      await this.cache?.invalidate(CATALOG_PREFIX);
      return result;
    } as unknown as typeof descriptor.value;
  };
}
