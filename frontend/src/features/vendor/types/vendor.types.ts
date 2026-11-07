export type VendorStorefrontStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
export type VendorOrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "SHIPPING"
  | "COMPLETED"
  | "CANCELLED";

export interface VendorDashboardSummary {
  productCount: number;
  orderCount: number;
  ordersNeedingActionCount: number;
  revenue: string;
}

export interface VendorDashboardStatusCount {
  status: VendorOrderStatus;
  count: number;
}

export interface VendorDashboardOrderItem {
  productName: string;
  variantName: string;
  quantity: string;
  unit: string;
  lineTotal: string;
}

export interface VendorDashboardOrder {
  id: string;
  orderNumber: string;
  status: Extract<VendorOrderStatus, "PENDING" | "ACCEPTED">;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  subtotal: string;
  items: VendorDashboardOrderItem[];
}

export interface VendorDashboardLowStockOffer {
  id: string;
  productName: string;
  variantName: string;
  stock: string;
  unit: string;
}

export interface VendorDashboard {
  vendor: {
    name: string;
    slug: string;
  };
  summary: VendorDashboardSummary;
  ordersByStatus: VendorDashboardStatusCount[];
  ordersNeedingAction: VendorDashboardOrder[];
  lowStockOffers: VendorDashboardLowStockOffer[];
}

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
  joinedAt: string;
  followerCount: number;
}

export interface VendorFollowState {
  isFollowing: boolean;
  followerCount: number;
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
