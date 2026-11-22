export interface ProductImage {
  id: string;
  imageUrl: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface PreparationOption {
  id: string;
  label: string;
  description: string;
  isDefault?: boolean;
}

export interface VendorDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  address: string;
  province: string;
  district: string;
  ratingAverage: number;
  ratingCount: number;
  verified: boolean;
}

/** Only facts stored in the database; missing ones are null. */
export interface TechnicalSpecifications {
  commonName: string | null;
  scientificName: string | null;
  origin: string | null;
}

export interface ReviewItem {
  id: string;
  authorName: string;
  rating: number;
  content: string | null;
  imageUrls: string[];
  createdAt: string;
}

export interface ReviewsSummary {
  ratingAverage: number;
  reviewCount: number;
  ratingBreakdown: Record<number, number>;
  reviews: ReviewItem[];
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  isFeatured: boolean;
  sku: string | null;
  unit: string;
  sizeLabel: string | null;
  /** null when no approved (ACTIVE) vendor offers the product: there is no price, not a price of 0. */
  price: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
  stock: number;
  inStock: boolean;
  isDiscontinued: boolean;
  offerId: string | null;
  species: {
    id: string;
    commonName: string;
    scientificName: string | null;
    slug: string;
    description: string | null;
  } | null;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  images: ProductImage[];
  vendor: VendorDetail | null;
  specifications: TechnicalSpecifications;
  preparationOptions: PreparationOption[];
  reviewsSummary: ReviewsSummary;
}

