import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartService } from './cart.service.js';
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

  it('should reject adding unavailable or discontinued products', async () => {
    await expect(
      cartService.addToCart('user-1', {
        offerId: 'prod-discontinued',
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
