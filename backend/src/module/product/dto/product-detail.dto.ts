export interface ProductDetailDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  isFeatured: boolean;
  sku: string | null;
  unit: string;
  /** Size of the displayed variant, e.g. "15 - 20 con/kg". */
  sizeLabel: string | null;
  price: number;
  /** Not stored yet; null until vendors can set a list price. */
  originalPrice: number | null;
  discountPercent: number | null;
  stock: number;
  inStock: boolean;
  isDiscontinued: boolean;
  /** Offer the price and stock come from; null when nothing is for sale. */
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
  images: Array<{
    id: string;
    imageUrl: string;
    altText: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }>;
  vendor: {
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
  } | null;
  /** Only facts stored in the database; other spec fields are not modelled yet. */
  specifications: {
    commonName: string | null;
    scientificName: string | null;
    origin: string | null;
  };
  reviewsSummary: {
    ratingAverage: number;
    reviewCount: number;
    ratingBreakdown: Record<number, number>;
    reviews: Array<{
      id: string;
      authorName: string;
      rating: number;
      content: string | null;
      imageUrls: string[];
      createdAt: string;
    }>;
  };
  preparationOptions: Array<{
    id: string;
    label: string;
    description: string;
    isDefault?: boolean;
  }>;
}

export interface AddToCartDto {
  offerId: string;
  quantity: number;
  preparationOption?: string;
}
