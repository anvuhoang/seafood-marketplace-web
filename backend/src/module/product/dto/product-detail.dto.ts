export interface ProductDetailDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: string;
  isFeatured: boolean;
  sku?: string | null;
  unit: string;
  price: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
  stock: number;
  inStock: boolean;
  isDiscontinued: boolean;
  species?: {
    id?: string;
    commonName: string;
    scientificName?: string | null;
    slug?: string;
    description?: string | null;
  } | null;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: string;
    imageUrl: string;
    altText?: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }>;
  vendor: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    logoUrl?: string | null;
    coverUrl?: string | null;
    address: string;
    province: string;
    district: string;
    ratingAverage: number;
    ratingCount: number;
    verified: boolean;
    responseTimeMinutes?: number;
    positiveRatingPercent?: number;
  };
  specifications: {
    commonName: string;
    scientificName: string;
    habitat: string;
    origin: string;
    catchMethod: string;
    storageCondition: string;
    packagingStandard: string;
    wasteRatio: string;
    culinaryAdvice?: string;
  };
  reviewsSummary: {
    ratingAverage: number;
    reviewCount: number;
    ratingBreakdown: Record<number, number>;
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
