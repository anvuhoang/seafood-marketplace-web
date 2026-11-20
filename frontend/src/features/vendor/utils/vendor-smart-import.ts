import type { SmartImportDraft, SmartImportMissingField } from "../types/vendor-smart-import.types";
import { newVariant } from "./vendor-product-form";
import type { ProductFormValues } from "./vendor-product-form";

export const MISSING_LABELS: Record<SmartImportMissingField, string> = {
  name: "tên sản phẩm",
  category: "danh mục",
  unit: "đơn vị tính",
  price: "giá bán",
  stock: "tồn kho",
};

/**
 * The AI draft as the values of the proposal form. Amounts become the plain digits
 * a vendor would type; anything the AI left out stays empty rather than guessed,
 * and no image is added (the vendor uploads those).
 */
export function smartDraftToForm(draft: SmartImportDraft): ProductFormValues {
  return {
    name: draft.name,
    description: draft.description ?? "",
    categoryIds: draft.categoryId ? [draft.categoryId] : [],
    images: [],
    variants: draft.variants.map((variant) => ({
      ...newVariant(),
      name: variant.name,
      unit: variant.unit,
      sizeLabel: variant.sizeLabel ?? "",
      price: variant.price === null ? "" : String(variant.price),
      stock: variant.stock === null ? "" : String(variant.stock),
    })),
  };
}

/** The engine that heard the vendor, in words: our own model, Groq, or the offline stand-in. */
export function describeEngine(engine: string): string {
  if (engine.startsWith("local:")) return `Whisper tự host (${engine.slice(6)})`;
  if (engine === "groq") return "Groq Whisper";
  if (engine === "mock") return "giả lập (chỉ để thử)";
  return engine;
}

/** "giá bán, tồn kho" for the fields still to fill in, or null when nothing is missing. */
export function describeMissing(missing: SmartImportMissingField[]): string | null {
  return missing.length === 0 ? null : missing.map((field) => MISSING_LABELS[field]).join(", ");
}
