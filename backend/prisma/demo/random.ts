/**
 * A small seeded random generator. The demo data is made with it instead of Math.random(), so every run produces
 * exactly the same shop: the same products, prices, customers, orders and reviews. That keeps the seed repeatable
 * (running it twice adds nothing) and lets a test or a screenshot rely on the data.
 */
export class Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** A number in [0, 1). mulberry32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** An integer from min to max, both included. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with the given probability (0 to 1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** One item, where each has a weight: `[['a', 70], ['b', 30]]` gives "a" seven times in ten. */
  weighted<T>(items: ReadonlyArray<readonly [T, number]>): T {
    const total = items.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = this.next() * total;
    for (const [item, weight] of items) {
      roll -= weight;
      if (roll < 0) return item;
    }
    return items[items.length - 1]![0];
  }

  /** `count` different items, in random order. */
  sample<T>(items: readonly T[], count: number): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy.slice(0, Math.min(count, copy.length));
  }
}

/** Text without accents and punctuation, for slugs and e-mail addresses. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Rounds a price to a sum a shop would write: a multiple of 1,000 dong (or 500 below 50,000). */
export function roundPrice(value: number): number {
  const step = value < 50_000 ? 500 : 1_000;
  return Math.max(step, Math.round(value / step) * step);
}
