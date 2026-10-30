export type VendorStorefrontStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";

export interface VendorStorefrontCategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface VendorStorefrontProduct {
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

export interface VendorStorefrontProfile {
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
}

export interface VendorSummary {
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

export interface VendorStorefront {
  vendor: VendorStorefrontProfile;
  status: VendorStorefrontStatus;
  isActive: boolean;
  productCount: number;
  categories: VendorStorefrontCategory[];
  products: VendorStorefrontProduct[];
}
