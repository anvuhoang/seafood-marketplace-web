import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerOrderService } from '../../order/customer-order.service.js';
import type { CustomerOrderQueryDto } from '../../order/dto/customer-order.dto.js';
import type { ChatTool, ToolContext, ToolOutcome } from '../chat.types.js';
import { extractOrderNumber } from '../text.js';
import { loginRequired } from './login-required.js';
import { itemNames, orderCard, orderForModel } from './order-format.js';
import { reqString } from './tool-args.js';

const NOT_FOUND = { error: 'Không tìm thấy đơn hàng này trong tài khoản của khách.' };

/**
 * Orders of the signed-in customer. The user id is the one in the token (the model cannot choose it) and each
 * query goes through CustomerOrderService, which answers "not found" for anyone else's order number.
 */
@Injectable()
export class GetMyOrderTool implements ChatTool {
  readonly statusLabel = 'Đang tra cứu đơn hàng...';
  readonly declaration = {
    name: 'get_my_order',
    description:
      'Xem chi tiết một đơn hàng của khách đang đăng nhập: trạng thái, thanh toán, từng vựa, mã vận đơn. Mã đơn dạng "HSE-12345678". ' +
      'Chỉ tra được đơn của chính khách.',
    parameters: {
      type: 'object' as const,
      properties: { orderNumber: { type: 'string', description: 'Mã đơn hàng, ví dụ "HSE-12345678".' } },
      required: ['orderNumber'],
    },
  };

  constructor(private readonly orders: CustomerOrderService) {}

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    if (!context.userId) return loginRequired();
    const orderNumber = extractOrderNumber(reqString(args, 'orderNumber', 40));
    if (!orderNumber) return { data: { error: 'Mã đơn không đúng dạng "HSE-12345678".' } };

    try {
      const order = await this.orders.getOrder(context.userId, orderNumber);
      return { data: { order: orderForModel(order) }, cards: [orderCard(order)] };
    } catch (error) {
      if (error instanceof NotFoundException) return { data: NOT_FOUND };
      throw error;
    }
  }
}

@Injectable()
export class ListMyRecentOrdersTool implements ChatTool {
  readonly statusLabel = 'Đang xem đơn hàng gần đây...';
  readonly declaration = {
    name: 'list_my_recent_orders',
    description: 'Liệt kê tối đa 5 đơn hàng gần nhất của khách đang đăng nhập. Dùng khi khách hỏi "đơn của tôi đâu" mà không nêu mã đơn.',
    parameters: { type: 'object' as const, properties: {} },
  };

  constructor(private readonly orders: CustomerOrderService) {}

  async execute(_args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    if (!context.userId) return loginRequired();
    const list = await this.orders.listOrders(context.userId, { pageSize: 5 } as CustomerOrderQueryDto);
    return {
      data: { orders: list.items.map(orderForModel), total: list.pagination.totalItems },
      cards: list.items.map(orderCard),
    };
  }
}

/** Offers "buy this order again". Nothing is added to the cart until the customer presses the button. */
@Injectable()
export class ProposeReorderTool implements ChatTool {
  readonly statusLabel = 'Đang chuẩn bị mua lại...';
  readonly declaration = {
    name: 'propose_reorder',
    description:
      'Đề xuất mua lại một đơn cũ của khách. Công cụ chỉ hiện nút xác nhận, KHÔNG tự thêm vào giỏ; hãy nói khách bấm nút để xác nhận.',
    parameters: {
      type: 'object' as const,
      properties: { orderNumber: { type: 'string', description: 'Mã đơn cũ, ví dụ "HSE-12345678".' } },
      required: ['orderNumber'],
    },
  };

  constructor(private readonly orders: CustomerOrderService) {}

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    if (!context.userId) return loginRequired();
    const orderNumber = extractOrderNumber(reqString(args, 'orderNumber', 40));
    if (!orderNumber) return { data: { error: 'Mã đơn không đúng dạng "HSE-12345678".' } };

    try {
      const order = await this.orders.getOrder(context.userId, orderNumber);
      const items = itemNames(order);
      return {
        data: { proposed: true, orderNumber, items, note: 'Đã hiện nút xác nhận. Khách phải bấm thì hàng mới vào giỏ.' },
        cards: [{ type: 'reorder', orderNumber, items }],
      };
    } catch (error) {
      if (error instanceof NotFoundException) return { data: NOT_FOUND };
      throw error;
    }
  }
}
