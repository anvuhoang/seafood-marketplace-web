import { Injectable } from '@nestjs/common';
import { CartService } from '../../cart/cart.service.js';
import { CART_QUANTITY_MAX } from '../../cart/dto/cart-quantity.validator.js';
import type { ChatTool, ToolOutcome } from '../chat.types.js';
import { reqQuantity, reqString } from './tool-args.js';

/**
 * "Add to cart" as a proposal. The model only says what it would add; the customer sees a card and presses a
 * button, and the browser then calls the normal cart API. So the model can never change a cart by itself,
 * and a made-up offer id is caught here because the offer is read back from the database.
 */
@Injectable()
export class ProposeAddToCartTool implements ChatTool {
  readonly statusLabel = 'Đang chuẩn bị thêm vào giỏ...';
  readonly declaration = {
    name: 'propose_add_to_cart',
    description:
      'Đề xuất thêm một sản phẩm vào giỏ hàng. Chỉ hiện thẻ có nút xác nhận, KHÔNG tự thêm; hãy nói khách bấm nút để xác nhận. ' +
      'offerId phải lấy từ kết quả search_products, không tự đặt.',
    parameters: {
      type: 'object' as const,
      properties: {
        offerId: { type: 'string', description: 'offerId của sản phẩm trong kết quả search_products.' },
        quantity: { type: 'number', description: 'Số lượng theo đơn vị của sản phẩm (kg, con...). Có thể có phần lẻ, ví dụ 1.5.' },
      },
      required: ['offerId', 'quantity'],
    },
  };

  constructor(private readonly cart: CartService) {}

  async execute(args: Record<string, unknown>): Promise<ToolOutcome> {
    const offerId = reqString(args, 'offerId', 64);
    const quantity = reqQuantity(args, 'quantity', CART_QUANTITY_MAX);

    // The same pricing the cart uses: it knows the stock and why a line cannot be bought.
    const quote = await this.cart.quote({ items: [{ offerId, quantity }] }).catch(() => null);
    const line = quote?.items[0];
    if (!line) return { data: { error: 'Không tìm thấy sản phẩm này. Hãy tìm lại bằng search_products.' } };
    if (!line.available) {
      return { data: { error: line.problem ?? 'Sản phẩm này hiện không thể mua với số lượng đó.', stock: line.stock } };
    }

    return {
      data: {
        proposed: true,
        productName: line.productName,
        quantity: line.quantity,
        unit: line.unit,
        total: line.subtotal,
        note: 'Đã hiện nút xác nhận. Khách phải bấm thì hàng mới vào giỏ.',
      },
      cards: [
        {
          type: 'cart_proposal',
          offerId: line.offerId,
          productName: line.productName,
          slug: line.productSlug,
          imageUrl: line.imageUrl,
          vendor: line.vendor.name,
          unit: line.unit,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        },
      ],
    };
  }
}
