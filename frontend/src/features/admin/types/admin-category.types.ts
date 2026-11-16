export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  parentName: string | null;
  sortOrder: number;
  isActive: boolean;
  /** Products tagged with this category directly. */
  productCount: number;
  /** Subcategories directly below this one. */
  childCount: number;
  /** Active, but customers cannot see it because its parent is hidden. */
  hiddenByParent: boolean;
}

export interface AdminCategoryList {
  items: AdminCategory[];
  counts: { total: number; active: number; inactive: number };
}

/** What the form sends. `null` clears an optional field. */
export interface CategoryInput {
  name: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
}
