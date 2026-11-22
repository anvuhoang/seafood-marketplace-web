export type SmartImportMissingField = "name" | "category" | "unit" | "price" | "stock";

export interface SmartImportVariant {
  name: string;
  /** Empty when the vendor did not say. */
  unit: string;
  sizeLabel: string | null;
  /** VND per unit; null when missing or unusable. */
  price: number | null;
  stock: number | null;
}

/** An editable proposal from the AI. Nothing is saved until the vendor submits the form. */
export interface SmartImportDraft {
  name: string;
  description: string | null;
  categoryId: string | null;
  variants: SmartImportVariant[];
  /** Fields the vendor still has to fill in. */
  missing: SmartImportMissingField[];
  /** Things worth a second look. */
  warnings: string[];
}
