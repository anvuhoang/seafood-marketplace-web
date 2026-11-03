import { ApiProperty } from '@nestjs/swagger';

export const VENDOR_STOREFRONT_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const;
export type VendorStorefrontStatus = (typeof VENDOR_STOREFRONT_STATUSES)[number];

/** Approved vendor card shown on the home page and in vendor lists. */
export class VendorSummaryDto {
  /** @example "2f9c1b7a-4e0d-4c55-9b8e-61a3d0f7c2b4" */
  id: string;
  /** @example "Vựa Thủy Sản Phú Quốc Xanh" */
  name: string;
  /** @example "vua-thuy-san-phu-quoc-xanh" */
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  /** District and province, e.g. "Phú Quốc, Kiên Giang". */
  location: string;
  /** @example 4.9 */
  ratingAverage: number;
  /** @example 342 */
  ratingCount: number;
  /** Number of products the vendor has on sale. @example 12 */
  productCount: number;
}

export class VendorStorefrontCategoryDto {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export class VendorStorefrontCategoryRefDto {
  id: string;
  name: string;
  slug: string;
}

export class VendorStorefrontProductDto {
  id: string;
  name: string;
  slug: string;
  /** @example "kg" */
  unit: string;
  /**
   * Price in VND per unit.
   * @example 420000
   */
  price: number;
  stock: number;
  inStock: boolean;
  isFeatured: boolean;
  speciesName: string | null;
  imageUrl: string | null;
  categories: VendorStorefrontCategoryRefDto[];
}

export class VendorStorefrontProfileDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  /** Contact number shown to customers, if the vendor has one. */
  phone: string | null;
  address: string;
  province: string;
  district: string;
  ratingAverage: number;
  ratingCount: number;
  /** When the vendor joined (ISO 8601). */
  joinedAt: string;
  /** Number of customers following this storefront. @example 128 */
  followerCount: number;
}

export class FollowStateDto {
  /** Whether the signed-in customer follows this vendor. */
  isFollowing: boolean;
  /** Total number of followers. @example 128 */
  followerCount: number;
}

export class VendorStorefrontDto {
  vendor: VendorStorefrontProfileDto;
  @ApiProperty({ enum: VENDOR_STOREFRONT_STATUSES })
  status: VendorStorefrontStatus;
  /** Only ACTIVE vendors show products. */
  isActive: boolean;
  productCount: number;
  categories: VendorStorefrontCategoryDto[];
  products: VendorStorefrontProductDto[];
}
