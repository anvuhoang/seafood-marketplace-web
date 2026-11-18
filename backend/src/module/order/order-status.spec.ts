import { describe, it, expect } from 'vitest';
import type { VendorOrderStatus } from '@prisma/client';
import {
  acceptBlockedReason,
  allowedVendorActions,
  canCustomerCancel,
  canTransition,
  deriveOrderStatus,
  nextPaymentStatus,
  transitionRefusedMessage,
  VENDOR_ORDER_STATUS_LABELS,
  VENDOR_ORDER_STATUSES,
} from './order-status.js';

/** The only moves a vendor order may make, written out by hand. */
const VALID_TRANSITIONS = new Set([
  'PENDING>ACCEPTED',
  'PENDING>CANCELLED',
  'ACCEPTED>PREPARING',
  'ACCEPTED>CANCELLED',
  'PREPARING>SHIPPING',
  'SHIPPING>COMPLETED',
]);

const ALL_PAIRS = VENDOR_ORDER_STATUSES.flatMap((from) =>
  VENDOR_ORDER_STATUSES.map((to) => [from, to] as const),
);

describe('order status rules', () => {
  describe('canTransition (every 6×6 pair)', () => {
    it('covers all 36 pairs', () => expect(ALL_PAIRS).toHaveLength(36));

    it.each(ALL_PAIRS)('%s → %s', (from, to) => {
      expect(canTransition(from, to)).toBe(VALID_TRANSITIONS.has(`${from}>${to}`));
    });
  });

  it('names the current status in every refusal', () => {
    for (const [from, to] of ALL_PAIRS) {
      if (VALID_TRANSITIONS.has(`${from}>${to}`)) continue;
      expect(transitionRefusedMessage(from, to)).toContain(VENDOR_ORDER_STATUS_LABELS[from]);
    }
  });

  describe('acceptBlockedReason', () => {
    it.each([
      ['COD', 'PAID'],
      ['BANK_TRANSFER', 'PAID'],
      ['CARD', 'PAID'],
      ['COD', 'PENDING'],
    ] as const)('%s payment %s can be accepted', (method, status) => {
      expect(acceptBlockedReason({ method, status })).toBeNull();
    });

    it.each([
      ['BANK_TRANSFER', 'PENDING'],
      ['E_WALLET', 'PENDING'],
      ['CARD', 'FAILED'],
      ['BANK_TRANSFER', 'REFUNDED'],
      ['COD', 'FAILED'],
      ['COD', 'REFUNDED'],
    ] as const)('%s payment %s cannot', (method, status) => {
      expect(acceptBlockedReason({ method, status })).toEqual(expect.any(String));
    });

    it('refuses an order without a payment', () => {
      expect(acceptBlockedReason(null)).toEqual(expect.any(String));
    });
  });

  it('allowedVendorActions hides "accept" while it is blocked, never offers PENDING', () => {
    expect(allowedVendorActions('PENDING', { method: 'COD', status: 'PENDING' })).toEqual(['ACCEPTED', 'CANCELLED']);
    expect(allowedVendorActions('PENDING', { method: 'CARD', status: 'PENDING' })).toEqual(['CANCELLED']);
    expect(allowedVendorActions('ACCEPTED', { method: 'CARD', status: 'PAID' })).toEqual(['PREPARING', 'CANCELLED']);
    expect(allowedVendorActions('PREPARING', null)).toEqual(['SHIPPING']);
    expect(allowedVendorActions('SHIPPING', null)).toEqual(['COMPLETED']);
    expect(allowedVendorActions('COMPLETED', null)).toEqual([]);
    expect(allowedVendorActions('CANCELLED', null)).toEqual([]);
  });

  describe('deriveOrderStatus', () => {
    it.each<[VendorOrderStatus[], string]>([
      // one vendor
      [['PENDING'], 'PENDING'],
      [['ACCEPTED'], 'CONFIRMED'],
      [['PREPARING'], 'PROCESSING'],
      [['SHIPPING'], 'SHIPPING'],
      [['COMPLETED'], 'COMPLETED'],
      [['CANCELLED'], 'CANCELLED'],
      // several vendors: the slowest one still running wins
      [['PENDING', 'SHIPPING'], 'PENDING'],
      [['ACCEPTED', 'COMPLETED'], 'CONFIRMED'],
      [['SHIPPING', 'PREPARING', 'COMPLETED'], 'PROCESSING'],
      [['SHIPPING', 'COMPLETED'], 'SHIPPING'],
      // cancelled parts are ignored
      [['CANCELLED', 'ACCEPTED'], 'CONFIRMED'],
      [['CANCELLED', 'COMPLETED'], 'COMPLETED'],
      [['COMPLETED', 'CANCELLED', 'COMPLETED'], 'COMPLETED'],
      // everything cancelled
      [['CANCELLED', 'CANCELLED'], 'CANCELLED'],
    ])('%j → %s', (statuses, expected) => {
      expect(deriveOrderStatus(statuses)).toBe(expected);
    });
  });

  describe('canCustomerCancel', () => {
    it.each<[VendorOrderStatus[], boolean]>([
      [['PENDING'], true],
      [['PENDING', 'PENDING'], true],
      [['PENDING', 'CANCELLED'], true],
      [['PENDING', 'ACCEPTED'], false],
      [['SHIPPING'], false],
      [['CANCELLED'], false],
      [['CANCELLED', 'CANCELLED'], false],
    ])('%j → %s', (statuses, expected) => {
      expect(canCustomerCancel(statuses)).toBe(expected);
    });
  });

  describe('nextPaymentStatus', () => {
    it('refunds a paid order once every vendor part is cancelled', () => {
      expect(nextPaymentStatus({ method: 'CARD', status: 'PAID' }, ['CANCELLED', 'CANCELLED'])).toBe('REFUNDED');
    });

    it('keeps PAID when only part of a multi-vendor order is cancelled', () => {
      expect(nextPaymentStatus({ method: 'CARD', status: 'PAID' }, ['CANCELLED', 'ACCEPTED'])).toBeNull();
    });

    it('marks an unpaid, fully cancelled order as FAILED', () => {
      expect(nextPaymentStatus({ method: 'COD', status: 'PENDING' }, ['CANCELLED'])).toBe('FAILED');
      expect(nextPaymentStatus({ method: 'BANK_TRANSFER', status: 'PENDING' }, ['CANCELLED'])).toBe('FAILED');
    });

    it('leaves FAILED and REFUNDED alone', () => {
      expect(nextPaymentStatus({ method: 'CARD', status: 'FAILED' }, ['CANCELLED'])).toBeNull();
      expect(nextPaymentStatus({ method: 'CARD', status: 'REFUNDED' }, ['CANCELLED'])).toBeNull();
    });

    it('collects cash on delivery only when every running part is COMPLETED', () => {
      const cod = { method: 'COD', status: 'PENDING' } as const;
      expect(nextPaymentStatus(cod, ['COMPLETED'])).toBe('PAID');
      expect(nextPaymentStatus(cod, ['COMPLETED', 'CANCELLED'])).toBe('PAID');
      for (const step of ['PENDING', 'ACCEPTED', 'PREPARING', 'SHIPPING'] as const) {
        expect(nextPaymentStatus(cod, [step])).toBeNull();
        expect(nextPaymentStatus(cod, ['COMPLETED', step])).toBeNull();
      }
    });

    it('never marks a non-COD order as paid', () => {
      expect(nextPaymentStatus({ method: 'BANK_TRANSFER', status: 'PENDING' }, ['COMPLETED'])).toBeNull();
    });
  });
});
