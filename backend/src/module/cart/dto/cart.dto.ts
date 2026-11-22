import { ApiProperty } from '@nestjs/swagger';

export class CartVendorDto {
  id: string;
  /** @example "Vựa Thủy Sản Phú Quốc Xanh" */
  name: string;
  /** @example "vua-thuy-san-phu-quoc-xanh" */
  slug: string;
  /** @example "Phú Quốc" */
  district: string;
  /** @example "Kiên Giang" */
  province: string;
}

/** The lines of one vendor, with the total of those that can be bought. */
export class CartVendorGroupDto {
  vendor: CartVendorDto;
  /** Lines of this vendor in the cart. @example 2 */
  lineCount: number;
  /** Total in VND of this vendor's lines that can be bought, worked out by the server. @example 1400000 */
  subtotal: number;
}

/** One line of the cart, with everything the screen shows. All money is worked out by the server. */
export class CartItemDto {
  /** The cart line (used to change or remove it). Null in a priced guest cart, which has no lines on the server. */
  @ApiProperty({ format: 'uuid', nullable: true })
  id: string | null;
  @ApiProperty({ format: 'uuid' })
  offerId: string;
  productId: string;
  /** @example "Tôm Sú Biển Tươi Sống Loại 1" */
  productName: string;
  /** Resolves the product detail page. @example "tom-su-bien-tuoi-song-loai-1" */
  productSlug: string;
  /** @example "Size 15 - 20 con/kg" */
  variantName: string;
  sizeLabel: string | null;
  imageUrl: string | null;
  vendor: CartVendorDto;
  /** @example "kg" */
  unit: string;
  /** Price in VND per unit, read from the offer now. @example 420000 */
  unitPrice: number;
  /** In the offer's unit. @example 2.5 */
  quantity: number;
  /** unitPrice x quantity in VND; 0 when the line cannot be bought. @example 1050000 */
  subtotal: number;
  /** What is left in stock now. @example 14 */
  stock: number;
  /** False when the line cannot be bought as it is (out of stock, withdrawn, store suspended, too many). It is left out of the total. */
  available: boolean;
  /** Why the line is not available, in Vietnamese; null when it is. */
  problem: string | null;
}

export class CartDto {
  items: CartItemDto[];
  /** The same lines grouped by vendor, in the order the vendors first appear, with each vendor's total. */
  vendors: CartVendorGroupDto[];
  /** Number of lines. @example 3 */
  lineCount: number;
  /** Total in VND of the lines that can be bought, worked out by the server. @example 1890000 */
  subtotal: number;
  /** True when some line cannot be bought and has to be changed or removed before checkout. */
  hasProblems: boolean;
}

/** Answer of a merge: the cart after merging, and what the server had to leave out or lower. */
export class MergeCartResultDto {
  cart: CartDto;
  /** Short Vietnamese notes, for example "Đã giảm số lượng ... còn 5 kg". */
  notices: string[];
}

/** A guest cart priced without being stored. */
export class QuoteDto extends CartDto {
  /** Offers that do not exist (any more); the browser should drop them. */
  unknownOfferIds: string[];
}
