export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
  /** A few species names currently for sale in the category. */
  examples: string[];
}
