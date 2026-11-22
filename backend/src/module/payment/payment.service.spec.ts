import { beforeEach, describe, expect, it, vi } from 'vitest';

// The real packages cannot be loaded in this test pool; the services only need their names here.
vi.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
vi.mock('@payos/node', () => ({ PayOS: class PayOS {} }));
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ORDER_NOT_FOUND } from '../order/order-lifecycle.service.js';
import { newOrderCode } from './order-code.js';
import {
  ORDER_IS_CANCELLED,
  PAYMENT_ALREADY_PAID,
  PAYMENT_NOT_FOUND,
  PAYMENT_NOT_ONLINE,
  PAYMENT_REFUNDED,
  PaymentService,
  paymentStatusFromPayos,
  toPayosAmount,
} from './payment.service.js';

const ME = 'user-1';
const NUMBER = 'HSE-90001';

/** A stand-in for Prisma's Decimal with the two methods the service uses. */
const money = (value: number) =>
  ({ toFixed: (digits: number) => value.toFixed(digits), toNumber: () => value }) as never;

interface FakePayment {
  id: string;
  method: string;
  status: string;
  amount: never;
  paidAt: Date | null;
  qrCode: string | null;
  checkoutUrl: string | null;
  expiresAt: Date | null;
  orderCode: bigint | null;
}

const payment = (overrides: Partial<FakePayment> = {}): FakePayment => ({
  id: 'payment-1',
  method: 'BANK_TRANSFER',
  status: 'PENDING',
  amount: money(1450000),
  paidAt: null,
  qrCode: null,
  checkoutUrl: null,
  expiresAt: null,
  orderCode: null,
  ...overrides,
});

const orderRow = (pay: FakePayment | null, status = 'PENDING') => ({
  id: 'order-1',
  orderNumber: NUMBER,
  status,
  payment: pay,
});

let prisma: {
  order: { findFirst: ReturnType<typeof vi.fn> };
  payment: {
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};
let payos: {
  isConfigured: ReturnType<typeof vi.fn>;
  linkTtlMinutes: ReturnType<typeof vi.fn>;
  createLink: ReturnType<typeof vi.fn>;
  getLink: ReturnType<typeof vi.fn>;
  verifyWebhook: ReturnType<typeof vi.fn>;
};
let service: PaymentService;

const rejection = async (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => error as Error,
  );

beforeEach(() => {
  prisma = {
    order: { findFirst: vi.fn() },
    payment: { findUnique: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  payos = {
    isConfigured: vi.fn().mockReturnValue(true),
    linkTtlMinutes: vi.fn().mockReturnValue(15),
    createLink: vi.fn(),
    getLink: vi.fn(),
    verifyWebhook: vi.fn(),
  };
  const config = { get: () => 'http://localhost:3000,http://admin.localhost:3000' };
  service = new PaymentService(prisma as never, config as never, payos as never);
});

describe('helpers', () => {
  it('makes an integer order code from the time plus three random digits', () => {
    expect(newOrderCode(1_700_000_000_000, () => 42)).toBe(1_700_000_000_000_042);
    const code = newOrderCode();
    expect(Number.isSafeInteger(code)).toBe(true);
    expect(newOrderCode(5, () => 1)).not.toBe(newOrderCode(5, () => 2));
  });

  it('maps PayOS statuses, leaving open ones alone', () => {
    expect(paymentStatusFromPayos('PAID')).toBe('PAID');
    expect(paymentStatusFromPayos('CANCELLED')).toBe('CANCELLED');
    expect(paymentStatusFromPayos('EXPIRED')).toBe('EXPIRED');
    expect(paymentStatusFromPayos('FAILED')).toBe('FAILED');
    for (const open of ['PENDING', 'PROCESSING', 'UNDERPAID']) {
      expect(paymentStatusFromPayos(open)).toBeNull();
    }
  });

  it('sends PayOS whole VND', () => {
    expect(toPayosAmount(money(1449999.99))).toBe(1450000);
  });
});

describe('getPayment', () => {
  it('looks only at the signed-in customer’s own order, and never calls PayOS', async () => {
    prisma.order.findFirst.mockResolvedValue(orderRow(payment()));
    await service.getPayment(ME, NUMBER);
    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: ME, orderNumber: NUMBER } }),
    );
    expect(payos.getLink).not.toHaveBeenCalled();
    expect(payos.createLink).not.toHaveBeenCalled();
  });

  it('is a 404 for an order that is not mine or does not exist', async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    const error = await rejection(service.getPayment(ME, NUMBER));
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error?.message).toBe(ORDER_NOT_FOUND);
  });

  it('is a different 404 for an order that has no payment yet', async () => {
    prisma.order.findFirst.mockResolvedValue(orderRow(null));
    const error = await rejection(service.getPayment(ME, NUMBER));
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error?.message).toBe(PAYMENT_NOT_FOUND);
  });

  it('shows the QR, its expiry and the amount while the payment is pending', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    prisma.order.findFirst.mockResolvedValue(
      orderRow(payment({ qrCode: 'QR', checkoutUrl: 'https://pay.example/x', expiresAt })),
    );
    expect(await service.getPayment(ME, NUMBER)).toEqual({
      orderNumber: NUMBER,
      method: 'BANK_TRANSFER',
      status: 'PENDING',
      amount: '1450000.00',
      paidAt: null,
      qrCode: 'QR',
      checkoutUrl: 'https://pay.example/x',
      expiresAt: expiresAt.toISOString(),
    });
  });

  it('hides the QR once the payment is not pending, and never shows PayOS internals', async () => {
    prisma.order.findFirst.mockResolvedValue(
      orderRow(payment({ status: 'PAID', qrCode: 'QR', checkoutUrl: 'u', paidAt: new Date(0), orderCode: 123n })),
    );
    const detail = await service.getPayment(ME, NUMBER);
    expect(detail).toMatchObject({ status: 'PAID', qrCode: null, checkoutUrl: null, expiresAt: null });
    expect(Object.keys(detail)).not.toContain('orderCode');
    expect(Object.keys(detail)).not.toContain('failureReason');
  });

  it('saves a pending payment past its time as EXPIRED, and does not show its QR', async () => {
    prisma.order.findFirst.mockResolvedValue(
      orderRow(payment({ qrCode: 'QR', expiresAt: new Date(Date.now() - 1000) })),
    );
    const detail = await service.getPayment(ME, NUMBER);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'payment-1', status: 'PENDING' }, data: expect.objectContaining({ status: 'EXPIRED' }) }),
    );
    expect(detail).toMatchObject({ status: 'EXPIRED', qrCode: null });
  });

  it('shows what was saved when someone else changed the payment first', async () => {
    prisma.order.findFirst
      .mockResolvedValueOnce(orderRow(payment({ qrCode: 'QR', expiresAt: new Date(Date.now() - 1000) })))
      .mockResolvedValueOnce(orderRow(payment({ status: 'PAID', paidAt: new Date(0) })));
    prisma.payment.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await service.getPayment(ME, NUMBER)).status).toBe('PAID');
  });
});

describe('createLink', () => {
  const link = {
    orderCode: 1_700_000_000_000_042,
    paymentLinkId: 'link-1',
    qrCode: 'QR-NEW',
    checkoutUrl: 'https://pay.example/new',
    expiredAt: undefined,
  };

  it.each([
    ['COD', payment({ method: 'COD' }), 'PENDING', PAYMENT_NOT_ONLINE],
    ['a paid payment', payment({ status: 'PAID' }), 'PENDING', PAYMENT_ALREADY_PAID],
    ['a refunded payment', payment({ status: 'REFUNDED' }), 'PENDING', PAYMENT_REFUNDED],
    ['a cancelled order', payment({ status: 'FAILED' }), 'CANCELLED', ORDER_IS_CANCELLED],
  ])('refuses %s with 409 and does not call PayOS', async (_name, pay, orderStatus, message) => {
    prisma.order.findFirst.mockResolvedValue(orderRow(pay, orderStatus));
    const error = await rejection(service.createLink(ME, NUMBER));
    expect(error).toBeInstanceOf(ConflictException);
    expect(error?.message).toBe(message);
    expect(payos.createLink).not.toHaveBeenCalled();
  });

  it('is a 404 for someone else’s order', async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    expect(await rejection(service.createLink(ME, NUMBER))).toBeInstanceOf(NotFoundException);
  });

  it('returns the QR that still works instead of making another', async () => {
    prisma.order.findFirst.mockResolvedValue(
      orderRow(payment({ qrCode: 'QR', expiresAt: new Date(Date.now() + 60_000) })),
    );
    expect((await service.createLink(ME, NUMBER)).qrCode).toBe('QR');
    expect(payos.createLink).not.toHaveBeenCalled();
  });

  it.each(['FAILED', 'CANCELLED', 'EXPIRED'])('makes a new QR with a new order code for a %s payment (the retry)', async (status) => {
    prisma.order.findFirst
      .mockResolvedValueOnce(orderRow(payment({ status, orderCode: 111n })))
      .mockResolvedValueOnce(orderRow(payment({ status: 'PENDING', qrCode: 'QR-NEW', orderCode: BigInt(link.orderCode) })));
    payos.createLink.mockResolvedValue(link);

    const detail = await service.createLink(ME, NUMBER);

    const request = payos.createLink.mock.calls[0][0];
    expect(request).toMatchObject({
      amount: 1450000,
      description: NUMBER,
      returnUrl: `http://localhost:3000/customer/orders/${NUMBER}/payment`,
      cancelUrl: `http://localhost:3000/customer/orders/${NUMBER}/payment`,
    });
    expect(Number.isSafeInteger(request.orderCode)).toBe(true);
    expect(request.orderCode).not.toBe(111);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'payment-1', status, orderCode: 111n },
      data: expect.objectContaining({
        status: 'PENDING',
        provider: 'PAYOS',
        orderCode: BigInt(link.orderCode),
        paymentLinkId: 'link-1',
        qrCode: 'QR-NEW',
        failureReason: null,
      }),
    });
    expect(detail).toMatchObject({ status: 'PENDING', qrCode: 'QR-NEW' });
  });

  it('is a 502 and saves nothing when PayOS refuses', async () => {
    prisma.order.findFirst.mockResolvedValue(orderRow(payment()));
    payos.createLink.mockRejectedValue(new Error('boom'));
    expect(await rejection(service.createLink(ME, NUMBER))).toBeInstanceOf(BadGatewayException);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('is a 503 when QR payment is not switched on', async () => {
    prisma.order.findFirst.mockResolvedValue(orderRow(payment()));
    payos.createLink.mockRejectedValue(new ServiceUnavailableException('off'));
    expect(await rejection(service.createLink(ME, NUMBER))).toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('syncPayment', () => {
  const pending = () => orderRow(payment({ qrCode: 'QR', orderCode: 777n }));

  it('does not call PayOS for a payment that is not pending', async () => {
    prisma.order.findFirst.mockResolvedValue(orderRow(payment({ status: 'PAID' })));
    await service.syncPayment(ME, NUMBER);
    expect(payos.getLink).not.toHaveBeenCalled();
  });

  it('saves CANCELLED when PayOS says the customer cancelled', async () => {
    prisma.order.findFirst.mockResolvedValue(pending());
    payos.getLink.mockResolvedValue({ status: 'CANCELLED', cancellationReason: null, transactions: [], amountPaid: 0 });
    await service.syncPayment(ME, NUMBER);
    expect(payos.getLink).toHaveBeenCalledWith(777);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'payment-1', status: 'PENDING' }, data: expect.objectContaining({ status: 'CANCELLED' }) }),
    );
  });

  it('saves PAID with the bank reference when PayOS says it was paid in full', async () => {
    prisma.order.findFirst.mockResolvedValue(pending());
    payos.getLink.mockResolvedValue({ status: 'PAID', transactions: [{ reference: 'TF1' }], amountPaid: 1450000 });
    await service.syncPayment(ME, NUMBER);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderCode: 777n, status: { in: ['PENDING', 'EXPIRED', 'CANCELLED', 'FAILED'] } },
        data: expect.objectContaining({ status: 'PAID', reference: 'TF1' }),
      }),
    );
  });

  it('changes nothing while PayOS still has the QR open', async () => {
    prisma.order.findFirst.mockResolvedValue(pending());
    payos.getLink.mockResolvedValue({ status: 'PENDING', transactions: [], amountPaid: 0 });
    await service.syncPayment(ME, NUMBER);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('is a 502 when PayOS cannot be reached', async () => {
    prisma.order.findFirst.mockResolvedValue(pending());
    payos.getLink.mockRejectedValue(new Error('down'));
    expect(await rejection(service.syncPayment(ME, NUMBER))).toBeInstanceOf(BadGatewayException);
  });
});

describe('handlePayosWebhook', () => {
  const hook = (code = '00', amount = 1450000) => ({ code, amount, orderCode: 777, reference: 'TF1' });
  const known = (
    overrides: Partial<{ status: string; amount: never; order: { orderNumber: string; status: string } }> = {},
  ) =>
    prisma.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PENDING',
      amount: money(1450000),
      orderCode: 777n,
      order: { orderNumber: NUMBER, status: 'PENDING' },
      ...overrides,
    });

  it('refuses a body whose signature is wrong with 400, and changes nothing', async () => {
    payos.verifyWebhook.mockRejectedValue(new Error('Invalid webhook data'));
    const error = await rejection(service.handlePayosWebhook({} as never));
    expect(error).toBeInstanceOf(BadRequestException);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('marks the payment PAID, with the reference and time, when the whole amount arrived', async () => {
    payos.verifyWebhook.mockResolvedValue(hook());
    known();
    await service.handlePayosWebhook({} as never);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { orderCode: 777n, status: { in: ['PENDING', 'EXPIRED', 'CANCELLED', 'FAILED'] } },
      data: expect.objectContaining({ status: 'PAID', reference: 'TF1', paidAt: expect.any(Date), failureReason: null }),
    });
  });

  it('marks nothing paid for an unsuccessful webhook code', async () => {
    payos.verifyWebhook.mockResolvedValue(hook('01'));
    await service.handlePayosWebhook({} as never);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('answers normally for an order code it does not know', async () => {
    payos.verifyWebhook.mockResolvedValue(hook());
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(service.handlePayosWebhook({} as never)).resolves.toBeUndefined();
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('does not mark a payment paid when less than the whole amount arrived', async () => {
    payos.verifyWebhook.mockResolvedValue(hook('00', 1000));
    known();
    await service.handlePayosWebhook({} as never);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('does nothing the second time PayOS sends the same payment', async () => {
    payos.verifyWebhook.mockResolvedValue(hook());
    known({ status: 'PAID' });
    await service.handlePayosWebhook({} as never);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('records money that arrives for an order cancelled meanwhile as paid, and says it needs a refund', async () => {
    payos.verifyWebhook.mockResolvedValue(hook());
    known({ status: 'FAILED', order: { orderNumber: NUMBER, status: 'CANCELLED' } });
    const warn = vi.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    await service.handlePayosWebhook({} as never);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }),
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('needs a refund'));
  });

  it('never brings back a refunded payment', async () => {
    payos.verifyWebhook.mockResolvedValue(hook());
    known({ status: 'REFUNDED' });
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });
    await service.handlePayosWebhook({} as never);
    expect(prisma.payment.updateMany.mock.calls[0][0].where.status).toEqual({ in: ['PENDING', 'EXPIRED', 'CANCELLED', 'FAILED'] });
  });
});
