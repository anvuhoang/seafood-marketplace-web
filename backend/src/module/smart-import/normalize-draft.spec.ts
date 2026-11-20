import { describe, expect, it } from 'vitest';
import { normalizeDraft, parseVietnameseAmount } from './normalize-draft.js';
import { AiProviderError } from './smart-import.types.js';

const CATEGORY = '11111111-1111-4111-8111-111111111111';
const context = { categories: [{ id: CATEGORY, name: 'Tôm' }] };

const variant = (overrides: Record<string, unknown> = {}) => ({
  name: 'Size 30',
  unit: 'kg',
  sizeLabel: '30 con/kg',
  price: 350000,
  stock: 40,
  ...overrides,
});

const draftOf = (overrides: Record<string, unknown> = {}) =>
  normalizeDraft(
    {
      name: 'Tôm sú',
      description: 'Bắt sáng nay ở Cà Mau',
      categoryId: CATEGORY,
      variants: [variant()],
      ...overrides,
    },
    context,
  );

describe('parseVietnameseAmount', () => {
  it.each([
    [350000, 350000],
    ['350000', 350000],
    ['350.000', 350000],
    ['1,250,000', 1250000],
    ['350k', 350000],
    ['350 K', 350000],
    ['350 nghìn', 350000],
    ['350 ngàn đ', 350000],
    ['1,5 triệu', 1500000],
    ['2tr', 2000000],
    ['0,5', 0.5],
    ['20', 20],
  ])('reads %j as %d', (input, expected) => {
    expect(parseVietnameseAmount(input)).toBe(expected);
  });

  it.each(['', 'abc', 'hai chục', '12abc', null, undefined, {}, NaN, Infinity])(
    'refuses %j',
    (input) => {
      expect(parseVietnameseAmount(input)).toBeNull();
    },
  );
});

describe('normalizeDraft', () => {
  it('keeps a complete draft as it is, with nothing missing', () => {
    const draft = draftOf();
    expect(draft).toEqual({
      name: 'Tôm sú',
      description: 'Bắt sáng nay ở Cà Mau',
      categoryId: CATEGORY,
      variants: [
        { name: 'Size 30', unit: 'kg', sizeLabel: '30 con/kg', price: 350000, stock: 40 },
      ],
      missing: [],
      warnings: [],
    });
  });

  it('reads spoken amounts the model left as text', () => {
    const draft = draftOf({ variants: [variant({ price: '350k', stock: '40' })] });
    expect(draft.variants[0]).toMatchObject({ price: 350000, stock: 40 });
  });

  it('lists what the vendor did not say instead of guessing', () => {
    const draft = draftOf({
      categoryId: null,
      variants: [variant({ unit: null, price: null, stock: null })],
    });
    expect(draft.missing).toEqual(['category', 'unit', 'price', 'stock']);
    expect(draft.variants[0]).toMatchObject({ unit: '', price: null, stock: null });
  });

  it('drops a category id the model made up', () => {
    const draft = draftOf({ categoryId: '22222222-2222-4222-8222-222222222222' });
    expect(draft.categoryId).toBeNull();
    expect(draft.missing).toContain('category');
  });

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['not a number', 'rẻ lắm'],
    ['too large', 1e15],
  ])('blanks a %s price and warns', (_label, price) => {
    const draft = draftOf({ variants: [variant({ price })] });
    expect(draft.variants[0].price).toBeNull();
    expect(draft.missing).toContain('price');
    expect(draft.warnings.length).toBeGreaterThan(0);
  });

  it('blanks a negative stock but accepts zero', () => {
    expect(draftOf({ variants: [variant({ stock: -1 })] }).variants[0].stock).toBeNull();
    expect(draftOf({ variants: [variant({ stock: 0 })] }).variants[0].stock).toBe(0);
  });

  it('keeps at most three decimals of stock and whole dong of price', () => {
    const draft = draftOf({ variants: [variant({ stock: 2.123456, price: 350000.6 })] });
    expect(draft.variants[0]).toMatchObject({ stock: 2.123, price: 350001 });
  });

  it('warns about a price that looks like "350" instead of 350 nghìn', () => {
    const draft = draftOf({ variants: [variant({ price: 350 })] });
    expect(draft.variants[0].price).toBe(350);
    expect(draft.warnings.join(' ')).toMatch(/thấp bất thường/);
  });

  it('turns "ký" and "cân" into kg and keeps other units', () => {
    const units = draftOf({
      variants: [
        variant({ name: 'A', sizeLabel: null, unit: 'ký' }),
        variant({ name: 'B', sizeLabel: null, unit: 'Cân' }),
        variant({ name: 'C', sizeLabel: null, unit: 'hộp' }),
      ],
    }).variants.map((item) => item.unit);
    expect(units).toEqual(['kg', 'kg', 'hộp']);
  });

  it('drops a duplicate variant, which the save would refuse', () => {
    const draft = draftOf({ variants: [variant(), variant({ name: 'size 30' })] });
    expect(draft.variants).toHaveLength(1);
    expect(draft.warnings.join(' ')).toMatch(/trùng/);
  });

  it('always returns at least one variant', () => {
    const draft = draftOf({ variants: [] });
    expect(draft.variants).toHaveLength(1);
    expect(draft.missing).toEqual(expect.arrayContaining(['unit', 'price', 'stock']));
  });

  it('names a variant that has no name', () => {
    expect(draftOf({ variants: [variant({ name: null, sizeLabel: null })] }).variants[0].name).toBe(
      'Loại 1',
    );
  });

  it('cuts text to the column limits', () => {
    const draft = draftOf({ name: 'x'.repeat(500), description: 'y'.repeat(9000) });
    expect(draft.name).toHaveLength(220);
    expect(draft.description).toHaveLength(5000);
  });

  it.each([null, undefined, 'text', 42, []])('refuses %j as an answer', (raw) => {
    expect(() => normalizeDraft(raw, context)).toThrow(AiProviderError);
  });

  it('refuses an answer with nothing in it', () => {
    expect(() => normalizeDraft({ name: null, variants: [] }, context)).toThrow(
      AiProviderError,
    );
  });
});
