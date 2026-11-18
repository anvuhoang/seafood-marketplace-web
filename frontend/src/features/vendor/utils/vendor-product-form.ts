import type {
  DraftProductInput,
  SettableOfferStatus,
  VendorDraftProduct,
  VendorOfferStatus,
} from "../types/vendor-product.types";

/** Same limits as the API DTOs (and the database columns). */
export const PRODUCT_LIMITS = {
  nameMin: 2,
  nameMax: 220,
  descriptionMax: 5000,
  categoriesMax: 5,
  imagesMax: 5,
  variantsMax: 20,
  variantNameMax: 180,
  unitMax: 30,
  sizeLabelMax: 100,
} as const;

export const PRICE_MAX = 999_999_999_999.99;
export const STOCK_MAX = 999_999_999.999;

export const OFFER_STATUS_BADGES: Record<VendorOfferStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Đang bán", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  PAUSED: { label: "Tạm ngưng", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  OUT_OF_STOCK: { label: "Hết hàng (cũ)", className: "bg-slate-100 text-slate-700 ring-slate-300" },
  DISCONTINUED: { label: "Đã ngừng bán", className: "bg-rose-50 text-rose-800 ring-rose-200" },
};

export const STATUS_FILTERS: Array<{ value: VendorOfferStatus | ""; label: string }> = [
  { value: "", label: "Tất cả (trừ đã ngừng)" },
  { value: "ACTIVE", label: "Đang bán" },
  { value: "PAUSED", label: "Tạm ngưng" },
  { value: "OUT_OF_STOCK", label: "Hết hàng (cũ)" },
  { value: "DISCONTINUED", label: "Đã ngừng bán" },
];

/** Where an offer can move next; nothing once it is discontinued. */
export function nextStatuses(status: VendorOfferStatus): SettableOfferStatus[] {
  if (status === "DISCONTINUED") return [];
  return (["ACTIVE", "PAUSED", "DISCONTINUED"] as const).filter((next) => next !== status);
}

const VND = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const QUANTITY = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });

export const formatVnd = (value: string | number) => `${VND.format(Number(value))} đ`;
export const formatQuantity = (value: string | number) => QUANTITY.format(Number(value));

/**
 * A number typed by the vendor: digits with an optional decimal part after "."
 * or ",". Thousands separators are not accepted, so "450.000" reads as 450 with
 * three decimals and is refused for a price instead of silently becoming 450.
 */
function parseAmount(text: string): { value: number; decimals: number } | null {
  const trimmed = text.trim().replace(/\s/g, "");
  const match = /^(\d+)(?:[.,](\d+))?$/.exec(trimmed);
  if (!match) return null;
  return { value: Number(`${match[1]}.${match[2] ?? "0"}`), decimals: match[2]?.length ?? 0 };
}

export function validatePrice(text: string): { value?: number; error?: string } {
  if (!text.trim()) return { error: "Vui lòng nhập giá bán." };
  const parsed = parseAmount(text);
  if (!parsed) return { error: "Giá bán phải là số." };
  if (parsed.decimals > 2) return { error: "Giá bán chỉ được có tối đa 2 chữ số thập phân." };
  if (parsed.value <= 0) return { error: "Giá bán phải lớn hơn 0." };
  if (parsed.value > PRICE_MAX) return { error: "Giá bán tối đa 999.999.999.999,99 đ." };
  return { value: parsed.value };
}

export function validateStock(text: string): { value?: number; error?: string } {
  if (!text.trim()) return { error: "Vui lòng nhập tồn kho." };
  const parsed = parseAmount(text);
  if (!parsed) return { error: "Tồn kho phải là số và không được âm." };
  if (parsed.decimals > 3) return { error: "Tồn kho chỉ được có tối đa 3 chữ số thập phân." };
  if (parsed.value > STOCK_MAX) return { error: "Tồn kho tối đa 999.999.999,999." };
  return { value: parsed.value };
}

/** An API decimal ("1450000.00") as the vendor would type it ("1450000"). */
export function amountToInput(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

export type OfferField = "price" | "stock";
export type OfferFormErrors = Partial<Record<OfferField, string>>;

/** Splits API messages into price/stock errors and the rest. */
export function mapOfferMessages(messages: string[]): { fields: OfferFormErrors; other: string[] } {
  const fields: OfferFormErrors = {};
  const other: string[] = [];
  for (const message of messages) {
    const field: OfferField | null = /giá bán/i.test(message) ? "price" : /tồn kho/i.test(message) ? "stock" : null;
    if (field && !fields[field]) fields[field] = message;
    else if (!field) other.push(message);
  }
  return { fields, other };
}

/* ---------- Draft product form ---------- */

export interface VariantFormValues {
  /** Stable key for React lists. */
  key: string;
  /** Existing variant id when editing. */
  id?: string;
  name: string;
  unit: string;
  sizeLabel: string;
  /** Price and stock are only entered for new variants. */
  price: string;
  stock: string;
  /** Existing offer, shown read-only on the edit page. */
  existingOffer?: { price: string; stock: string; status: VendorOfferStatus } | null;
  removable: boolean;
}

export interface ImageFormValue {
  imageUrl: string;
  isPrimary: boolean;
}

export interface ProductFormValues {
  name: string;
  description: string;
  categoryIds: string[];
  images: ImageFormValue[];
  variants: VariantFormValues[];
}

export type VariantField = "name" | "unit" | "sizeLabel" | "price" | "stock";
export type VariantErrors = Partial<Record<VariantField, string>>;

export interface ProductFormErrors {
  name?: string;
  description?: string;
  categoryIds?: string;
  images?: string;
  variants?: string;
  variantRows: Record<number, VariantErrors>;
}

export const emptyErrors = (): ProductFormErrors => ({ variantRows: {} });

export function hasErrors(errors: ProductFormErrors): boolean {
  const { variantRows, ...top } = errors;
  return Object.values(top).some(Boolean) || Object.values(variantRows).some((row) => Object.values(row).some(Boolean));
}

let keySeed = 0;
export const newVariant = (): VariantFormValues => ({
  key: `new-${++keySeed}`,
  name: "",
  unit: "kg",
  sizeLabel: "",
  price: "",
  stock: "",
  removable: true,
});

export const emptyProductForm = (): ProductFormValues => ({
  name: "",
  description: "",
  categoryIds: [],
  images: [],
  variants: [newVariant()],
});

export function draftToForm(product: VendorDraftProduct): ProductFormValues {
  return {
    name: product.name,
    description: product.description ?? "",
    categoryIds: product.categories.map((category) => category.id),
    images: product.images.map((image) => ({ imageUrl: image.imageUrl, isPrimary: image.isPrimary })),
    variants: product.variants.map((variant) => ({
      key: variant.id,
      id: variant.id,
      name: variant.name,
      unit: variant.unit,
      sizeLabel: variant.sizeLabel ?? "",
      price: "",
      stock: "",
      existingOffer: variant.offer,
      removable: variant.removable,
    })),
  };
}

/**
 * Checks the form like the API does and builds the request body. New variants
 * get an offer only when a price is entered (stock defaults to required then).
 */
export function validateProductForm(values: ProductFormValues): { errors: ProductFormErrors; input?: DraftProductInput } {
  const errors = emptyErrors();
  const name = values.name.trim();
  if (!name) errors.name = "Vui lòng nhập tên sản phẩm.";
  else if (name.length < PRODUCT_LIMITS.nameMin) errors.name = "Tên sản phẩm phải có tối thiểu 2 ký tự.";
  else if (name.length > PRODUCT_LIMITS.nameMax) errors.name = "Tên sản phẩm tối đa 220 ký tự.";

  const description = values.description.trim();
  if (description.length > PRODUCT_LIMITS.descriptionMax) errors.description = "Mô tả sản phẩm tối đa 5000 ký tự.";

  if (values.categoryIds.length === 0) errors.categoryIds = "Vui lòng chọn ít nhất 1 danh mục.";
  else if (values.categoryIds.length > PRODUCT_LIMITS.categoriesMax) errors.categoryIds = "Chỉ chọn tối đa 5 danh mục.";

  if (values.images.length > PRODUCT_LIMITS.imagesMax) errors.images = "Tối đa 5 ảnh sản phẩm.";
  else if (values.images.length > 0 && values.images.filter((image) => image.isPrimary).length !== 1) {
    errors.images = "Vui lòng chọn đúng 1 ảnh đại diện.";
  }

  if (values.variants.length === 0) errors.variants = "Vui lòng thêm ít nhất 1 biến thể.";
  else if (values.variants.length > PRODUCT_LIMITS.variantsMax) errors.variants = "Tối đa 20 biến thể.";

  const seen = new Set<string>();
  const variants = values.variants.map((variant, index) => {
    const row: VariantErrors = {};
    const variantName = variant.name.trim();
    const unit = variant.unit.trim();
    const sizeLabel = variant.sizeLabel.trim();
    if (!variantName) row.name = "Vui lòng nhập tên biến thể.";
    else if (variantName.length > PRODUCT_LIMITS.variantNameMax) row.name = "Tên biến thể tối đa 180 ký tự.";
    if (!unit) row.unit = "Vui lòng nhập đơn vị tính.";
    else if (unit.length > PRODUCT_LIMITS.unitMax) row.unit = "Đơn vị tính tối đa 30 ký tự.";
    if (sizeLabel.length > PRODUCT_LIMITS.sizeLabelMax) row.sizeLabel = "Kích cỡ tối đa 100 ký tự.";

    const key = `${normalize(variantName)}|${normalize(sizeLabel)}`;
    if (variantName && seen.has(key)) row.name = "Có biến thể bị trùng cả tên và kích cỡ.";
    seen.add(key);

    let offer: { price: number; stock: number } | undefined;
    if (!variant.id && (variant.price.trim() || variant.stock.trim())) {
      const price = validatePrice(variant.price);
      const stock = validateStock(variant.stock);
      if (price.error) row.price = price.error;
      if (stock.error) row.stock = stock.error;
      if (price.value !== undefined && stock.value !== undefined) offer = { price: price.value, stock: stock.value };
    }

    if (Object.keys(row).length > 0) errors.variantRows[index] = row;
    return {
      ...(variant.id && { id: variant.id }),
      name: variantName,
      unit,
      sizeLabel: sizeLabel || null,
      ...(offer && { offer }),
    };
  });

  if (hasErrors(errors)) return { errors };
  return {
    errors,
    input: {
      name,
      description: description || null,
      categoryIds: values.categoryIds,
      images: values.images.map((image) => ({ imageUrl: image.imageUrl, isPrimary: image.isPrimary })),
      variants,
    },
  };
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const VARIANT_MESSAGE_FIELDS: Array<[RegExp, VariantField]> = [
  [/tên biến thể|bị trùng/i, "name"],
  [/đơn vị/i, "unit"],
  [/kích cỡ/i, "sizeLabel"],
  [/giá bán/i, "price"],
  [/tồn kho/i, "stock"],
];

const PRODUCT_MESSAGE_FIELDS: Array<[RegExp, "name" | "description" | "categoryIds" | "images" | "variants"]> = [
  [/tên sản phẩm/i, "name"],
  [/mô tả sản phẩm/i, "description"],
  [/danh mục/i, "categoryIds"],
  [/ảnh/i, "images"],
  [/biến thể/i, "variants"],
];

/**
 * Places API messages on their fields. Nested messages arrive as
 * "variants.2.offer.Giá bán phải lớn hơn 0." and go to that variant's row.
 */
export function mapProductMessages(messages: string[]): { errors: ProductFormErrors; other: string[] } {
  const errors = emptyErrors();
  const other: string[] = [];
  for (const message of messages) {
    // "images.0.Ảnh không hợp lệ..." is about the image list as a whole.
    const raw = message.replace(/^images\.\d+\./, "");
    const nested = /^variants\.(\d+)\.(?:offer\.)?([\s\S]*)$/.exec(raw);
    if (nested) {
      const index = Number(nested[1]);
      const text = nested[2]!;
      const field = VARIANT_MESSAGE_FIELDS.find(([pattern]) => pattern.test(text))?.[1];
      const row = (errors.variantRows[index] ??= {});
      if (field && !row[field]) row[field] = text;
      else if (!field) other.push(text);
      continue;
    }
    const field = PRODUCT_MESSAGE_FIELDS.find(([pattern]) => pattern.test(raw))?.[1];
    if (field && !errors[field]) errors[field] = raw;
    else if (!field) other.push(raw);
  }
  return { errors, other };
}
