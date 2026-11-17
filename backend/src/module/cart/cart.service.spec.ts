import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartService, VENDOR_NOT_SELLING_MESSAGE } from './cart.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BadRequestException } from '@nestjs/common';

describe('CartService', () => {
  let cartService: CartService;
  let prismaService: any;

  beforeEach(() => {
    prismaService = {
      vendorOffer: {
        findUnique: vi.fn(),
      },
      cart: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      cartItem: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };
    cartService = new CartService(prismaService as PrismaService);
  });

  it('should be defined', () => {
    expect(cartService).toBeDefined();
  });

  it('should add item within stock successfully', async () => {
    const result = await cartService.addToCart('user-1', {
      offerId: 'prod-1',
      quantity: 2,
    });

    expect(result.success).toBe(true);
    expect(result.item.quantity).toBe(2);
  });

  it('should reject quantity exceeding maximum stock limit', async () => {
    await expect(
      cartService.addToCart('user-1', {
        offerId: 'prod-1',
        quantity: 99,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('vendor status', () => {
    const OFFER_ID = '6c1f0c3e-2a4b-4d8e-9f10-1a2b3c4d5e6f';
    const offerOf = (vendorStatus: string) => ({
      id: OFFER_ID,
      status: 'ACTIVE',
      stock: 20,
      variant: { product: { status: 'ACTIVE' } },
      vendor: { status: vendorStatus },
    });

    it.each(['PENDING', 'REJECTED', 'SUSPENDED'])(
      'refuses an offer from a %s vendor and writes nothing',
      async (vendorStatus) => {
        prismaService.vendorOffer.findUnique.mockResolvedValue(offerOf(vendorStatus));

        await expect(cartService.addToCart('user-1', { offerId: OFFER_ID, quantity: 1 })).rejects.toThrow(
          new BadRequestException(VENDOR_NOT_SELLING_MESSAGE),
        );
        expect(prismaService.cart.create).not.toHaveBeenCalled();
        expect(prismaService.cartItem.upsert).not.toHaveBeenCalled();
      },
    );

    it('loads the vendor status together with the offer', async () => {
      prismaService.vendorOffer.findUnique.mockResolvedValue(offerOf('ACTIVE'));
      prismaService.cart.findUnique.mockResolvedValue({ id: 'cart-1' });
      prismaService.cartItem.findUnique.mockResolvedValue(null);
      prismaService.cartItem.upsert.mockResolvedValue({ cartId: 'cart-1', offerId: OFFER_ID, quantity: 1 });

      const result = await cartService.addToCart('user-1', { offerId: OFFER_ID, quantity: 1 });

      expect(result.success).toBe(true);
      expect(prismaService.vendorOffer.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.objectContaining({ vendor: { select: { status: true } } }) }),
      );
    });
  });

  it('should reject adding unavailable or discontinued products', async () => {
    await expect(
      cartService.addToCart('user-1', {
        offerId: 'prod-discontinued',
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
