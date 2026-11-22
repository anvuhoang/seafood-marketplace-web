/** Offer statuses as stored. OUT_OF_STOCK is legacy (seed data); vendors cannot pick it. */
export type VendorOfferStatus = "ACTIVE" | "PAUSED" | "OUT_OF_STOCK" | "DISCONTINUED";
/** Statuses a vendor can move an offer to. DISCONTINUED is final. */
export type SettableOfferStatus = "ACTIVE" | "PAUSED" | "DISCONTINUED";
export type VendorProductStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

export interface VendorCategoryRef {
  id: string;
  name: string;
}

export interface VendorOfferProduct {
  id: string;
  name: string;
  slug: string;
  status: VendorProductStatus;
  /** A draft this vendor proposed; only those can be edited. */
  isOwnProduct: boolean;
  imageUrl: string | null;
  categories: VendorCategoryRef[];
}

export interface VendorOfferVariant {
  id: string;
  name: string;
  unit: string;
  sizeLabel: string | null;
}

/** One row of GET /vendors/me/offers. Price and stock are decimal strings. */
export interface VendorOffer {
  id: string;
  product: VendorOfferProduct;
  variant: VendorOfferVariant;
  price: string;
  stock: string;
  status: VendorOfferStatus;
  updatedAt: string;
}

export interface VendorOfferSummary {
  total: number;
  active: number;
  paused: number;
  lowStock: number;
  discontinued: number;
  pendingApproval: number;
  lowStockThreshold: number;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface VendorOfferList {
  items: VendorOffer[];
  summary: VendorOfferSummary;
  pagination: Pagination;
}

export interface VendorOfferQuery {
  search?: string;
  status?: VendorOfferStatus;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export interface VendorCatalogVariant extends VendorOfferVariant {
  alreadyOffered: boolean;
}

export interface VendorCatalogProduct extends VendorOfferProduct {
  variants: VendorCatalogVariant[];
}

export interface VendorCatalogList {
  items: VendorCatalogProduct[];
  pagination: Pagination;
}

/** Price and stock as numbers; the API refuses text. */
export interface OfferAmounts {
  price: number;
  stock: number;
}

export interface CreateOfferInput extends OfferAmounts {
  variantId: string;
  status?: "ACTIVE" | "PAUSED";
}

export interface ProductImageInput {
  imageUrl: string;
  altText?: string | null;
  isPrimary: boolean;
}

export interface ProductVariantInput {
  /** Set when editing an existing variant of a draft. */
  id?: string;
  name: string;
  unit: string;
  sizeLabel?: string | null;
  /** Only for new variants. */
  offer?: OfferAmounts;
}

export interface DraftProductInput {
  name: string;
  description: string | null;
  categoryIds: string[];
  images: ProductImageInput[];
  variants: ProductVariantInput[];
}

export interface VendorProductImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface VendorProductVariant extends VendorOfferVariant {
  offer: { id: string; price: string; stock: string; status: VendorOfferStatus } | null;
  removable: boolean;
}

/** GET /vendors/me/products/:id: a draft the vendor proposed. */
export interface VendorDraftProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: VendorProductStatus;
  categories: VendorCategoryRef[];
  images: VendorProductImage[];
  variants: VendorProductVariant[];
  createdAt: string;
  updatedAt: string;
  editable: boolean;
  imageUploadEnabled: boolean;
}
