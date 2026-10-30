export type VendorStorefrontStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

export interface VendorStorefrontCategoryDto {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface VendorStorefrontProductDto {
  id: string;
  name: string;
  slug: string;
  unit: string;
  price: number;
  stock: number;
  inStock: boolean;
  isFeatured: boolean;
  speciesName: string | null;
  imageUrl: string | null;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface VendorSummaryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  location: string;
  ratingAverage: number;
  ratingCount: number;
  productCount: number;
}

export interface VendorStorefrontDto {
  vendor: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    phone: string | null;
    address: string;
    province: string;
    district: string;
    ratingAverage: number;
    ratingCount: number;
  };
  status: VendorStorefrontStatus;
  isActive: boolean;
  productCount: number;
  categories: VendorStorefrontCategoryDto[];
  products: VendorStorefrontProductDto[];
}
