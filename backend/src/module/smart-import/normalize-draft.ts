import {
  OFFER_PRICE_MAX,
  OFFER_STOCK_MAX,
} from '../vendor/dto/offer-amount.validator.js';
import { VENDOR_PRODUCT_LIMITS } from '../vendor/dto/vendor-product.dto.js';
import { AiProviderError, type ExtractionContext } from './smart-import.types.js';

/** Below this a seafood price is almost certainly "350" meant as 350 nghìn. */
const SUSPICIOUSLY_LOW_PRICE = 1_000;
/** Above this a price per unit is almost certainly a slip (extra zeros). */
const SUSPICIOUSLY_HIGH_PRICE = 50_000_000;

export type MissingField = 'name' | 'category' | 'unit' | 'price' | 'stock';

export interface DraftVariant {
  name: string;
  unit: string;
  sizeLabel: string | null;
  /** VND per unit; null when the vendor did not say or the value was unusable. */
  price: number | null;
  stock: number | null;
}

/** The fixed shape the UI edits. Nothing here is saved until the vendor confirms. */
export interface NormalizedDraft {
  name: string;
  description: string | null;
  categoryId: string | null;
  variants: DraftVariant[];
  /** Fields the vendor still has to fill in. */
  missing: MissingField[];
  /** Things worth a second look, in Vietnamese for the vendor. */
  warnings: string[];
}

const UNIT_FACTORS: Record<string, number> = {
  k: 1_000,
  nghin: 1_000,
  ngan: 1_000,
  tr: 1_000_000,
  trieu: 1_000_000,
  m: 1_000_000,
};

const UNIT_ALIASES: Record<string, string> = {
  ky: 'kg',
  ki: 'kg',
  kg: 'kg',
  can: 'kg',
};

const stripAccents = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

/**
 * Reads an amount written the way people say it: 350000, "350.000", "350k",
 * "350 nghìn", "1,5 triệu". Returns null when it is not a plain amount.
 */
export function parseVietnameseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const text = stripAccents(value.toLowerCase()).replace(/\s+/g, '');
  const match = /^(\d+(?:[.,]\d+)*)(k|nghin|ngan|trieu|tr|m)?(?:d|vnd)?$/.exec(
    text,
  );
  if (!match) return null;

  const [, digits, unit] = match;
  // "350.000" and "1,250,000" are thousands separators, not decimals.
  const grouped = /^\d{1,3}([.,]\d{3})+$/.test(digits);
  const number = grouped
    ? Number(digits.replace(/[.,]/g, ''))
    : Number(digits.replace(',', '.'));
  if (!Number.isFinite(number)) return null;

  return number * (unit ? (UNIT_FACTORS[unit] ?? 1) : 1);
}

const cleanText = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text === '' ? null : text.slice(0, max);
};

/** "ký" and "cân" are kg; anything else is kept as the vendor said it. */
function normalizeUnit(value: unknown): string | null {
  const text = cleanText(value, VENDOR_PRODUCT_LIMITS.unitMax);
  if (!text) return null;
  return UNIT_ALIASES[stripAccents(text.toLowerCase())] ?? text;
}

const variantKey = (variant: DraftVariant) =>
  `${stripAccents(variant.name.toLowerCase())}|${stripAccents((variant.sizeLabel ?? '').toLowerCase())}`;

/**
 * Turns the model's raw JSON into the fixed draft shape. Unusable values become
 * null (the vendor fills them in) and are never guessed. Throws `bad_response`
 * only when there is no draft at all.
 */
export function normalizeDraft(
  raw: unknown,
  context: ExtractionContext,
): NormalizedDraft {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new AiProviderError('bad_response', 'The answer is not an object.');
  }
  const data = raw as Record<string, unknown>;
  const warnings: string[] = [];

  const name =
    cleanText(data.name, VENDOR_PRODUCT_LIMITS.nameMax) ?? '';
  const description = cleanText(
    data.description,
    VENDOR_PRODUCT_LIMITS.descriptionMax,
  );
  const categoryId =
    typeof data.categoryId === 'string' &&
    context.categories.some((category) => category.id === data.categoryId)
      ? data.categoryId
      : null;

  const rawVariants = Array.isArray(data.variants) ? data.variants : [];
  const variants: DraftVariant[] = [];
  const seen = new Set<string>();

  for (const item of rawVariants.slice(0, VENDOR_PRODUCT_LIMITS.variantsMax)) {
    if (typeof item !== 'object' || item === null) continue;
    const entry = item as Record<string, unknown>;

    const sizeLabel = cleanText(entry.sizeLabel, VENDOR_PRODUCT_LIMITS.sizeLabelMax);
    const variant: DraftVariant = {
      name:
        cleanText(entry.name, VENDOR_PRODUCT_LIMITS.variantNameMax) ??
        sizeLabel ??
        `Loại ${variants.length + 1}`,
      unit: normalizeUnit(entry.unit) ?? '',
      sizeLabel,
      price: normalizePrice(entry.price, warnings),
      stock: normalizeStock(entry.stock, warnings),
    };

    // Two identical variants would be refused on save; keep the first.
    const key = variantKey(variant);
    if (seen.has(key)) {
      warnings.push(`Bỏ bớt biến thể trùng: "${variant.name}".`);
      continue;
    }
    seen.add(key);
    variants.push(variant);
  }

  if (variants.length === 0) {
    variants.push({ name: 'Loại 1', unit: '', sizeLabel: null, price: null, stock: null });
  }

  const missing: MissingField[] = [];
  if (name === '') missing.push('name');
  if (categoryId === null) missing.push('category');
  if (variants.some((variant) => variant.unit === '')) missing.push('unit');
  if (variants.some((variant) => variant.price === null)) missing.push('price');
  if (variants.some((variant) => variant.stock === null)) missing.push('stock');

  if (name === '' && description === null && variants.every(isEmptyVariant)) {
    throw new AiProviderError('bad_response', 'Nothing could be read.');
  }

  return { name, description, categoryId, variants, missing, warnings };
}

const isEmptyVariant = (variant: DraftVariant) =>
  variant.unit === '' && variant.price === null && variant.stock === null;

function normalizePrice(value: unknown, warnings: string[]): number | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = parseVietnameseAmount(value);
  if (amount === null || amount <= 0 || amount > OFFER_PRICE_MAX) {
    warnings.push('Có giá không đọc được, vui lòng nhập lại.');
    return null;
  }
  const price = Math.round(amount);
  if (price < SUSPICIOUSLY_LOW_PRICE) {
    warnings.push(
      `Giá ${price.toLocaleString('vi-VN')} đ thấp bất thường, hãy kiểm tra lại (có phải ${price} nghìn đồng?).`,
    );
  } else if (price > SUSPICIOUSLY_HIGH_PRICE) {
    warnings.push(
      `Giá ${price.toLocaleString('vi-VN')} đ cao bất thường, hãy kiểm tra lại.`,
    );
  }
  return price;
}

function normalizeStock(value: unknown, warnings: string[]): number | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = parseVietnameseAmount(value);
  if (amount === null || amount < 0 || amount > OFFER_STOCK_MAX) {
    warnings.push('Có số lượng tồn kho không đọc được, vui lòng nhập lại.');
    return null;
  }
  // The column keeps three decimals.
  return Math.round(amount * 1000) / 1000;
}
