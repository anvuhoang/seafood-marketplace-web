import { describe, expect, it, vi } from 'vitest';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { PrismaService as RealPrismaService } from '../../prisma/prisma.service.js';
import { MailModule } from './mail.module.js';
import { MailService } from './mail.service.js';
import { OrderMailer } from './order-mailer.js';

const user = { email: 'lan@example.com', fullName: 'Lan' };

function setup(overrides: Record<string, unknown> = {}) {
  const prisma = {
    user: { findUnique: vi.fn(async () => user) },
    order: { findUnique: vi.fn(async () => ({ orderNumber: 'HS-1', user })) },
    payment: { findUnique: vi.fn(async () => ({ amount: { toString: () => '870000' }, paidAt: new Date(), order: { orderNumber: 'HS-1', user } })) },
    ...overrides,
  } as unknown as PrismaService;
  const send = vi.fn().mockResolvedValue(true);
  const mailer = new OrderMailer(prisma, { send, appUrl: 'https://shop.test' } as unknown as MailService);
  return { mailer, send };
}

describe('OrderMailer', () => {
  it('mails the customer when the order is on its way, delivered or cancelled', async () => {
    for (const to of ['SHIPPING', 'COMPLETED', 'CANCELLED'] as const) {
      const { mailer, send } = setup();
      await mailer.statusChanged('o1', 'PROCESSING', to);
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0].to).toBe('lan@example.com');
      expect(send.mock.calls[0][0].text).toContain('HS-1');
    }
  });

  it('stays quiet for changes that are not worth a mail', async () => {
    const { mailer, send } = setup();
    await mailer.statusChanged('o1', 'PENDING', 'CONFIRMED');
    await mailer.statusChanged('o1', 'SHIPPING', 'SHIPPING');
    expect(send).not.toHaveBeenCalled();
  });

  it('sends a payment receipt found by the PayOS order code', async () => {
    const { mailer, send } = setup();
    await mailer.paymentReceived(123n);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].text).toContain('HS-1');
  });

  it('never throws: a failing lookup is only logged', async () => {
    const { mailer, send } = setup({ order: { findUnique: vi.fn().mockRejectedValue(new Error('db down')) } });
    await expect(mailer.statusChanged('o1', 'PROCESSING', 'SHIPPING')).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('MailModule', () => {
  it('can be created by Nest, and without SMTP settings mails go to the log', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ mail: { provider: 'log', appUrl: 'https://shop.test' } })] }), MailModule],
    })
      .overrideProvider(RealPrismaService)
      .useValue({})
      .compile();
    const mail = moduleRef.get(MailService);
    expect(mail.stats().provider).toBe('log');
    expect(mail.appUrl).toBe('https://shop.test');
    expect(moduleRef.get(OrderMailer)).toBeInstanceOf(OrderMailer);
  });
});
