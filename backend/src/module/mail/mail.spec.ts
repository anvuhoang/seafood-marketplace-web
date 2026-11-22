import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SMTPServer } from 'smtp-server';
import type { AddressInfo } from 'node:net';
import { MailService } from './mail.service.js';
import { SmtpTransport } from './smtp.transport.js';
import type { MailMessage, MailTransport } from './mail.types.js';
import { escapeHtml, formatMoney, orderPlacedMail, passwordResetMail, type OrderMailData } from './mail.templates.js';

const config = new ConfigService({ mail: { appUrl: 'https://shop.test', from: '"Shop" <shop@test.vn>' } });
const message: MailMessage = { to: 'lan@example.com', subject: 'Hi', text: 'hello', html: '<p>hello</p>' };

function transport(send: MailTransport['send']): MailTransport {
  return { name: 'log', send };
}

describe('MailService', () => {
  it('hands the mail to the transport with the configured sender', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const service = new MailService(transport(send), config, [0]);
    expect(await service.send(message)).toBe(true);
    expect(send).toHaveBeenCalledWith(message, '"Shop" <shop@test.vn>');
    expect(service.stats()).toMatchObject({ sent: 1, failed: 0 });
  });

  it("tries again, then succeeds, when the mail server fails once", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('421 busy')).mockResolvedValue(undefined);
    const service = new MailService(transport(send), config, [0, 0, 0]);
    expect(await service.send(message)).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('never rejects: after the last try it resolves false and counts a failure', async () => {
    const send = vi.fn().mockRejectedValue(new Error('down'));
    const service = new MailService(transport(send), config, [0, 0, 0]);
    await expect(service.send(message)).resolves.toBe(false);
    expect(send).toHaveBeenCalledTimes(3);
    expect(service.stats()).toMatchObject({ sent: 0, failed: 1 });
  });

  it('skips an address that is not valid without calling the transport', async () => {
    const send = vi.fn();
    const service = new MailService(transport(send), config, [0]);
    expect(await service.send({ ...message, to: 'not-an-address' })).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('removes line breaks from the recipient and the subject, so headers cannot be added', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const service = new MailService(transport(send), config, [0]);
    await service.send({ ...message, subject: 'Hi\r\nBcc: spy@evil.test' });
    expect(send.mock.calls[0][0].subject).toBe('Hi Bcc: spy@evil.test');
    expect(await service.send({ ...message, to: 'a@b.vn\r\nBcc: spy@evil.test' })).toBe(false);
  });

  it('does nothing and says so when mail is off', async () => {
    const service = new MailService(null, config, [0]);
    expect(service.enabled).toBe(false);
    expect(await service.send(message)).toBe(false);
  });

  it('exposes the site address for links', () => {
    expect(new MailService(null, config).appUrl).toBe('https://shop.test');
  });
});

describe('SmtpTransport against a real SMTP server', () => {
  it('delivers the message with the sender, recipient, subject and both bodies', async () => {
    const received: string[] = [];
    const server = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      onData(stream, _session, done) {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          received.push(Buffer.concat(chunks).toString('utf8'));
          done();
        });
      },
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.server.address() as AddressInfo).port;
    try {
      const smtp = new SmtpTransport({ host: '127.0.0.1', port, secure: false, user: '', pass: '' });
      await smtp.send({ ...message, subject: 'Xác nhận đơn' }, '"Shop" <shop@test.vn>');
      expect(received).toHaveLength(1);
      expect(received[0]).toContain('To: lan@example.com');
      expect(received[0]).toContain('From: Shop <shop@test.vn>');
      expect(received[0]).toMatch(/Subject: .*(Xác|=\?UTF-8)/);
      expect(received[0]).toContain('hello');
      expect(received[0]).toContain('<p>hello</p>');
    } finally {
      await new Promise((resolve) => server.close(() => resolve(undefined)));
    }
  });

  it('fails (so the service can retry) when nothing is listening', async () => {
    const smtp = new SmtpTransport({ host: '127.0.0.1', port: 1, secure: false, user: '', pass: '' });
    await expect(smtp.send(message, 'a@b.vn')).rejects.toThrow();
  });
});

describe('mail templates', () => {
  it('escapes HTML so a name cannot inject markup', () => {
    expect(escapeHtml('<script>"&\'')).toBe('&lt;script&gt;&quot;&amp;&#39;');
    const mail = passwordResetMail({ to: 'a@b.vn', name: '<img src=x onerror=alert(1)>', url: 'https://shop.test/r?token=abc', minutes: 30 });
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).toContain('&lt;img');
  });

  it('puts the reset link and its lifetime in both versions', () => {
    const mail = passwordResetMail({ to: 'a@b.vn', name: 'Lan', url: 'https://shop.test/r?token=abc', minutes: 30 });
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain('https://shop.test/r?token=abc');
      expect(body).toContain('30');
    }
  });

  it('formats money in dong', () => {
    expect(formatMoney('840000')).toMatch(/840\.000\s?đ/);
  });

  const order: OrderMailData = {
    orderNumber: 'HS-1',
    createdAt: '2026-11-20T03:00:00.000Z',
    subtotal: '840000',
    shippingTotal: '30000',
    grandTotal: '870000',
    paymentMethod: 'BANK_TRANSFER',
    paymentStatus: 'PENDING',
    recipient: { name: 'Lan', phone: '0901000001', address: '1 Lê Lợi', ward: null, district: 'Q1', province: 'HCM' },
    customerNote: null,
    parts: [{ vendorName: 'Vựa A', shippingFee: '30000', items: [{ name: 'Tôm sú', variant: '1kg', quantity: '2', unit: 'kg', lineTotal: '840000' }] }],
  };

  it('the confirmation lists the items and, for an unpaid QR order, the payment link', () => {
    const mail = orderPlacedMail({ to: 'a@b.vn', name: 'Lan', order, appUrl: 'https://shop.test' });
    expect(mail.subject).toContain('HS-1');
    expect(mail.text).toContain('Tôm sú');
    expect(mail.text).toContain('https://shop.test/customer/orders/HS-1/payment');
  });

  it('does not ask for payment when the order is cash on delivery or already paid', () => {
    const cod = orderPlacedMail({ to: 'a@b.vn', name: 'Lan', order: { ...order, paymentMethod: 'COD' }, appUrl: 'https://shop.test' });
    const paid = orderPlacedMail({ to: 'a@b.vn', name: 'Lan', order: { ...order, paymentStatus: 'PAID' }, appUrl: 'https://shop.test' });
    expect(cod.text).not.toContain('/payment');
    expect(paid.text).not.toContain('/payment');
  });
});
