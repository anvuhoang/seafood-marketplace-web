import { ProductListingItem } from "@/features/catalog/types/catalog.types";

export interface VisualSearchResult {
  /** Species the image was recognised as, e.g. "Tôm sú". */
  label: string;
  /** Confidence between 0 and 1. */
  confidence: number;
  products: ProductListingItem[];
}
