import { Injectable } from '@nestjs/common';
import { ProductListingService } from '../../product/product-listing.service.js';
import type { ProductListingQueryDto } from '../../product/dto/product-listing.dto.js';
import type { ChatTool, ToolOutcome } from '../chat.types.js';
import { truncate } from '../text.js';
import { optBool, optEnum, optInt, optString } from './tool-args.js';

const SORTS = ['featured', 'price-asc', 'price-desc', 'newest'] as const;
const MAX_RESULTS = 6;

/** Finds products for sale. It uses the same search as the shop's product page, so prices and stock are live. */
@Injectable()
export class SearchProductsTool implements ChatTool {
  readonly statusLabel = 'Đang tìm sản phẩm...';
  readonly declaration = {
    name: 'search_products',
    description:
      'Tìm hải sản đang bán trên sàn theo từ khóa, danh mục, khoảng giá. Dùng mỗi khi khách hỏi về sản phẩm, giá, còn hàng hay cần gợi ý món. ' +
      'Giá và tồn kho CHỈ lấy từ kết quả của công cụ này. Với yêu cầu rộng như "lẩu hải sản", hãy gọi nhiều lần, mỗi lần một loại (tôm, mực, ghẹ...).',
    parameters: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Từ khóa ngắn: tên loài hoặc món, ví dụ "tôm sú", "ghẹ", "mực ống". Bỏ trống để xem theo danh mục.' },
        category: { type: 'string', description: 'Slug danh mục trong danh sách của hệ thống, ví dụ "tom-song".' },
        minPrice: { type: 'integer', description: 'Giá thấp nhất (VND mỗi đơn vị).' },
        maxPrice: { type: 'integer', description: 'Giá cao nhất (VND mỗi đơn vị).' },
        inStockOnly: { type: 'boolean', description: 'Chỉ lấy sản phẩm còn hàng. Mặc định true.' },
        sort: { type: 'string', enum: [...SORTS], description: 'Thứ tự: featured (nổi bật), price-asc, price-desc, newest.' },
        limit: { type: 'integer', description: `Số sản phẩm tối đa, 1 đến ${MAX_RESULTS}. Mặc định 5.` },
      },
    },
  };

  constructor(private readonly listing: ProductListingService) {}

  async execute(args: Record<string, unknown>): Promise<ToolOutcome> {
    const query: ProductListingQueryDto = {
      q: optString(args, 'query', 100),
      category: optString(args, 'category', 60),
      minPrice: optInt(args, 'minPrice', 0, 100_000_000),
      maxPrice: optInt(args, 'maxPrice', 0, 100_000_000),
      inStock: optBool(args, 'inStockOnly') === false ? undefined : 'true',
      sort: optEnum(args, 'sort', SORTS),
      limit: optInt(args, 'limit', 1, MAX_RESULTS) ?? 5,
      page: 1,
    };
    const result = await this.listing.listProducts(query);

    return {
      data: {
        total: result.pagination.totalItems,
        products: result.items.map((item) => ({
          offerId: item.offerId,
          name: item.name,
          species: item.speciesName,
          description: item.description ? truncate(item.description, 140) : null,
          price: item.price,
          unit: item.unit,
          stock: item.stock,
          inStock: item.inStock,
          vendor: `${item.vendor.name} (${item.vendor.district}, ${item.vendor.province})`,
          categories: item.categories.map((category) => category.name),
        })),
      },
      cards: result.items.map((item) => ({
        type: 'product' as const,
        offerId: item.offerId,
        name: item.name,
        slug: item.slug,
        imageUrl: item.imageUrl,
        price: item.price,
        unit: item.unit,
        vendor: item.vendor.name,
        inStock: item.inStock,
        stock: item.stock,
      })),
    };
  }
}
