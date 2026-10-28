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
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  address: string;
  province: string;
  district: string;
  ratingAverage: number;
  ratingCount: number;
  verified: boolean;
  responseTimeMinutes: number;
  positiveRatingPercent: number;
}

export interface TechnicalSpecifications {
  commonName: string;
  scientificName: string;
  habitat: string;
  origin: string;
  catchMethod: string;
  storageCondition: string;
  packagingStandard: string;
  wasteRatio: string;
  culinaryAdvice?: string;
}

export interface ReviewItem {
  id: string;
  authorName: string;
  authorSub?: string;
  avatar?: string;
  rating: number;
  date: string;
  content: string;
  verifiedPurchase: boolean;
  photos?: string[];
  vendorFeedback?: string;
}

export interface ReviewsSummary {
  ratingAverage: number;
  reviewCount: number;
  soldCount: number;
  questionCount: number;
  ratingBreakdown: Record<number, number>;
  reviews: ReviewItem[];
}

export interface RelatedProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  unit: string;
  image: string;
  badge?: string;
  tag?: string;
  inStock: boolean;
  soldNote?: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  isFeatured: boolean;
  sku: string;
  unit: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
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
  images: ProductImage[];
  vendor: VendorDetail;
  specifications: TechnicalSpecifications;
  preparationOptions: PreparationOption[];
  reviewsSummary: ReviewsSummary;
  relatedProducts: RelatedProductItem[];
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  unit: string;
  preparationOption: string;
  vendorName: string;
}
