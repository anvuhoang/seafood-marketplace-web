import { ProductListingItem } from "@/features/catalog/types/catalog.types";

export type VisualSearchOutcome = "matched" | "no_products" | "uncertain" | "not_seafood";
export type ConfidenceLevel = "high" | "medium" | "low";
export type ImageQuality = "good" | "blurry" | "dark" | "too_far" | "multiple_items";
export type VisualSearchMatchedBy = "species" | "category" | "keyword";

export interface VisualSearchPrediction {
  /** Species name from the catalogue when known, otherwise the model's short label. */
  label: string | null;
  scientificName: string | null;
  speciesSlug: string | null;
  categorySlug: string | null;
  /** 0..1, judged by the model itself; not a calibrated probability. */
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  /** Up to 3 visible features, in Vietnamese. */
  features: string[];
}

export interface VisualSearchAlternative {
  label: string;
  speciesSlug: string;
  confidence: number;
}

export interface VisualSearchResult {
  outcome: VisualSearchOutcome;
  /** Null when the photo does not show seafood. */
  prediction: VisualSearchPrediction | null;
  alternatives: VisualSearchAlternative[];
  imageQuality: ImageQuality;
  matchedBy: VisualSearchMatchedBy | null;
  /** Real products for sale, up to 8. */
  products: ProductListingItem[];
  totalProducts: number;
  /** Keywords for /products?q=… */
  searchQuery: string | null;
  disclaimer: string;
}
