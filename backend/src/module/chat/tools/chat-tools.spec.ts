import { describe, expect, it, vi } from 'vitest';

// The real package cannot be loaded in this test pool; nothing here needs it.
vi.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { NotFoundException } from '@nestjs/common';
import { ContactSupportTool, RememberPreferenceTool } from './account.tools.js';
import { ProposeAddToCartTool } from './cart-proposal.tool.js';
import { GetMyOrderTool, ListMyRecentOrdersTool, ProposeReorderTool } from './order.tools.js';
import { SearchKnowledgeTool } from './search-knowledge.tool.js';
import { SearchProductsTool } from './search-products.tool.js';
import { ToolArgError } from './tool-args.js';
import type { ToolContext } from '../chat.types.js';

const GUEST: ToolContext = { userId: null, conversationId: 'c-1' };
const ME: ToolContext = { userId: 'user-1', conversationId: 'c-1' };

const order = (orderNumber = 'HSE-90002') => ({
  orderNumber,
  createdAt: '2026-11-18T08:30:00.000Z',
  status: 'CONFIRMED' as const,
  grandTotal: '490000.00',
  payment: { method: 'COD' as const, status: 'PENDING' as const, paidAt: null },
  canCancel: false,
  vendorOrders: [
    {
      id: 'v-1',
      vendor: { name: 'Vựa Phú Quốc', slug: 'phu-quoc' },
      status: 'ACCEPTED' as const,
      shipment: null,
      items: [{ productName: 'Ghẹ xanh', quantity: '1', unit: 'kg' }],
    },
  ],
});

const fakeOrders = (overrides: Record<string, unknown> = {}) =>
  ({
    getOrder: vi.fn(async (_userId: string, orderNumber: string) => order(orderNumber)),
    listOrders: vi.fn(async () => ({ items: [order('HSE-90002'), order('HSE-90004')], pagination: { totalItems: 2 } })),
    ...overrides,
  }) as never;

describe('order tools: only the signed-in customer\'s orders', () => {
  it('ask a guest to sign in and never touch the database', async () => {
    const orders = fakeOrders();
    for (const tool of [new GetMyOrderTool(orders), new ListMyRecentOrdersTool(orders), new ProposeReorderTool(orders)]) {
      const outcome = await tool.execute({ orderNumber: 'HSE-90002' }, GUEST);
      expect(outcome.cards).toEqual([{ type: 'login_required' }]);
      expect(outcome.data).toMatchObject({ requiresLogin: true });
    }
    expect((orders as unknown as { getOrder: ReturnType<typeof vi.fn> }).getOrder).not.toHaveBeenCalled();
  });

  it('look the order up as the token\'s user, even when the model names somebody else', async () => {
    const orders = fakeOrders();
    const outcome = await new GetMyOrderTool(orders).execute({ orderNumber: 'hse-90002', userId: 'someone-else' }, ME);

    expect((orders as unknown as { getOrder: ReturnType<typeof vi.fn> }).getOrder).toHaveBeenCalledWith('user-1', 'HSE-90002');
    expect(outcome.cards?.[0]).toMatchObject({ type: 'order', orderNumber: 'HSE-90002', statusLabel: 'Đã xác nhận' });
    expect(outcome.data).toMatchObject({ order: { orderNumber: 'HSE-90002', statusLabel: 'Đã xác nhận', grandTotal: 490000, payment: 'Thanh toán khi nhận hàng · thu khi giao' } });
  });

  it('answer "not found" for an order that is not theirs, without a card', async () => {
    const orders = fakeOrders({ getOrder: vi.fn(async () => Promise.reject(new NotFoundException('x'))) });
    for (const tool of [new GetMyOrderTool(orders), new ProposeReorderTool(orders)]) {
      const outcome = await tool.execute({ orderNumber: 'HSE-12345678' }, ME);
      expect(outcome.data).toEqual({ error: 'Không tìm thấy đơn hàng này trong tài khoản của khách.' });
      expect(outcome.cards).toBeUndefined();
    }
  });

  it('refuse a badly formed order number before asking the database', async () => {
    const orders = fakeOrders();
    const outcome = await new GetMyOrderTool(orders).execute({ orderNumber: "1'; DROP TABLE orders;--" }, ME);
    expect(outcome.data).toMatchObject({ error: expect.stringContaining('Mã đơn') });
    expect((orders as unknown as { getOrder: ReturnType<typeof vi.fn> }).getOrder).not.toHaveBeenCalled();
    await expect(new GetMyOrderTool(orders).execute({}, ME)).rejects.toBeInstanceOf(ToolArgError);
  });

  it('list the five latest orders, and only propose a reorder (nothing is added)', async () => {
    const orders = fakeOrders();
    const list = await new ListMyRecentOrdersTool(orders).execute({}, ME);
    expect((orders as unknown as { listOrders: ReturnType<typeof vi.fn> }).listOrders).toHaveBeenCalledWith('user-1', { pageSize: 5 });
    expect(list.cards).toHaveLength(2);

    const proposal = await new ProposeReorderTool(orders).execute({ orderNumber: 'HSE-90002' }, ME);
    expect(proposal.cards).toEqual([{ type: 'reorder', orderNumber: 'HSE-90002', items: ['Ghẹ xanh x1 kg'] }]);
  });
});

describe('propose_add_to_cart: a proposal, never a change', () => {
  const line = (overrides: Record<string, unknown> = {}) => ({
    offerId: '3d4e5f60-7182-4c9d-8e0f-2a3b4c5d6e7f',
    productName: 'Tôm sú',
    productSlug: 'tom-su',
    imageUrl: null,
    vendor: { name: 'Vựa A' },
    unit: 'kg',
    unitPrice: 420000,
    quantity: 2,
    subtotal: 840000,
    stock: 14,
    available: true,
    problem: null,
    ...overrides,
  });
  const cartWith = (items: unknown[]) => ({ quote: vi.fn(async () => ({ items })) }) as never;

  it('shows a card priced by the shop, and calls only quote()', async () => {
    const cart = cartWith([line()]);
    const outcome = await new ProposeAddToCartTool(cart).execute({ offerId: '3d4e5f60-7182-4c9d-8e0f-2a3b4c5d6e7f', quantity: 2 });

    expect((cart as unknown as { quote: ReturnType<typeof vi.fn> }).quote).toHaveBeenCalledWith({ items: [{ offerId: '3d4e5f60-7182-4c9d-8e0f-2a3b4c5d6e7f', quantity: 2 }] });
    expect(outcome.cards).toEqual([
      { type: 'cart_proposal', offerId: '3d4e5f60-7182-4c9d-8e0f-2a3b4c5d6e7f', productName: 'Tôm sú', slug: 'tom-su', imageUrl: null, vendor: 'Vựa A', unit: 'kg', unitPrice: 420000, quantity: 2 },
    ]);
    expect(outcome.data).toMatchObject({ proposed: true, total: 840000 });
  });

  it('catches an offer id the model made up', async () => {
    const outcome = await new ProposeAddToCartTool(cartWith([])).execute({ offerId: 'invented', quantity: 1 });
    expect(outcome.data).toMatchObject({ error: expect.stringContaining('Không tìm thấy') });
    expect(outcome.cards).toBeUndefined();
  });

  it('reports why a line cannot be bought (out of stock, too many)', async () => {
    const outcome = await new ProposeAddToCartTool(cartWith([line({ available: false, problem: 'Chỉ còn 14 kg.', stock: 14 })])).execute({ offerId: 'x', quantity: 50 });
    expect(outcome.data).toEqual({ error: 'Chỉ còn 14 kg.', stock: 14 });
    expect(outcome.cards).toBeUndefined();
  });

  it('refuses a bad quantity', async () => {
    const tool = new ProposeAddToCartTool(cartWith([line()]));
    for (const quantity of [0, -2, 'nhiều', null]) await expect(tool.execute({ offerId: 'x', quantity })).rejects.toBeInstanceOf(ToolArgError);
  });
});

describe('search_products', () => {
  const item = (n: number) => ({
    offerId: `offer-${n}`,
    name: `Tôm ${n}`,
    slug: `tom-${n}`,
    description: 'Tôm tươi',
    speciesName: 'Tôm',
    imageUrl: null,
    price: 100000 * n,
    unit: 'kg',
    stock: 5,
    inStock: true,
    vendor: { name: 'Vựa', district: 'Phú Quốc', province: 'Kiên Giang' },
    categories: [{ name: 'Tôm', slug: 'tom' }],
  });
  const listing = () => ({ listProducts: vi.fn(async () => ({ items: [item(1), item(2)], pagination: { totalItems: 9 } })) });

  it('searches in stock by default, and passes only clean arguments', async () => {
    const service = listing();
    const outcome = await new SearchProductsTool(service as never).execute(
      { query: '  tôm sú  ', maxPrice: '500000', sort: 'DROP TABLE', limit: 50, category: 5 },
    );

    expect(service.listProducts).toHaveBeenCalledWith({
      q: 'tôm sú',
      category: undefined,
      minPrice: undefined,
      maxPrice: 500000,
      inStock: 'true',
      sort: undefined,
      limit: 6,
      page: 1,
    });
    const data = outcome.data as { total: number; products: unknown[] };
    expect(data.total).toBe(9);
    expect(data.products).toHaveLength(2);
    expect(data.products[0]).toMatchObject({ offerId: 'offer-1', name: 'Tôm 1', price: 100000, vendor: 'Vựa (Phú Quốc, Kiên Giang)' });
    expect(outcome.cards).toHaveLength(2);
    expect(outcome.cards?.[1]).toMatchObject({ type: 'product', offerId: 'offer-2', price: 200000, vendor: 'Vựa' });
  });

  it('includes sold-out products only when asked', async () => {
    const service = listing();
    await new SearchProductsTool(service as never).execute({ inStockOnly: false });
    expect((service.listProducts.mock.calls[0] as unknown as [{ inStock?: string }])[0].inStock).toBeUndefined();
  });
});

describe('search_knowledge', () => {
  it('shows one source per document and passes the passages to the model', async () => {
    const knowledge = {
      search: vi.fn(async () => [
        { source: 'doi-tra', title: 'Đổi trả — Khi nào', content: 'a', score: 1 },
        { source: 'doi-tra', title: 'Đổi trả — Cách làm', content: 'b', score: 0.9 },
        { source: 'thanh-toan', title: 'Thanh toán — QR', content: 'c', score: 0.8 },
      ]),
    };
    const outcome = await new SearchKnowledgeTool(knowledge as never).execute({ question: 'đổi trả thế nào?' });
    expect(outcome.sources).toEqual([
      { source: 'doi-tra', title: 'Đổi trả' },
      { source: 'thanh-toan', title: 'Thanh toán' },
    ]);
    expect(outcome.data).toMatchObject({ passages: [{ source: 'doi-tra' }, { source: 'doi-tra' }, { source: 'thanh-toan' }] });
  });

  it('says so when nothing matches', async () => {
    const outcome = await new SearchKnowledgeTool({ search: vi.fn(async () => []) } as never).execute({ question: 'thời tiết' });
    expect(outcome.data).toMatchObject({ passages: [], note: expect.stringContaining('Không có tài liệu') });
    expect(outcome.sources).toEqual([]);
  });
});

describe('account tools', () => {
  it('remember a note only for a signed-in customer, under the token\'s user id', async () => {
    const context = { addNote: vi.fn(async () => ['Dị ứng tôm']) };
    const tool = new RememberPreferenceTool(context as never);

    expect((await tool.execute({ note: 'Dị ứng tôm' }, GUEST)).cards).toEqual([{ type: 'login_required' }]);
    expect(context.addNote).not.toHaveBeenCalled();

    const outcome = await tool.execute({ note: 'Dị ứng tôm', userId: 'someone-else' }, ME);
    expect(context.addNote).toHaveBeenCalledWith('user-1', 'Dị ứng tôm');
    expect(outcome.data).toEqual({ saved: true, rememberedCount: 1 });
  });

  it('show the hand-off form without sending anything', async () => {
    const outcome = await new ContactSupportTool().execute({ reason: 'Hàng bị ươn' });
    expect(outcome.cards).toEqual([{ type: 'handoff', reason: 'Hàng bị ươn' }]);
  });
});
