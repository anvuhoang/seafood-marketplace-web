import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReviewService, anonymizeName, signCloudinaryParams } from './review.service.js';
import { CreateReviewDto } from './dto/review.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';

const USER_ID = '11111111-2222-3333-4444-555555555555';
const ITEM_ID = '66666666-7777-8888-9999-000000000000';
const CLOUDINARY = { cloudName: 'demo-cloud', apiKey: 'key', apiSecret: 'secret' };
const OWN_IMAGE = `https://res.cloudinary.com/demo-cloud/image/upload/v1730000000/haisan-express/reviews/${USER_ID}/abc123.jpg`;

const product = { id: 'p1', name: 'Tôm sú', slug: 'tom-su', images: [{ imageUrl: 'https://img/tom.jpg' }] };

const reviewRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  rating: 5,
  content: 'Tôm còn bơi khỏe, thịt ngọt.',
  highlights: ['on-time'],
  isAnonymous: false,
  status: 'PUBLISHED',
  createdAt: new Date('2026-10-20T00:00:00Z'),
  product,
  images: [],
  orderItem: { vendorNameSnapshot: 'Vựa Biển Xanh', vendorOrder: { order: { orderNumber: 'HSE-1' } } },
  ...overrides,
});

const orderItem = (overrides: Record<string, unknown> = {}) => ({
  id: ITEM_ID,
  review: null,
  vendorOrder: { status: 'COMPLETED' },
  offer: { variant: { productId: 'p1' } },
  ...overrides,
});

const input: CreateReviewDto = { orderItemId: ITEM_ID, rating: 5, content: 'Tôm còn bơi khỏe, thịt ngọt.' };

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: any;
  let cloudinary: typeof CLOUDINARY | undefined;

  beforeEach(() => {
    cloudinary = CLOUDINARY;
    prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ fullName: 'Nguyễn Văn An' }) },
      orderItem: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      review: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    };
    const config = { get: vi.fn(() => cloudinary) } as unknown as ConfigService;
    service = new ReviewService(prisma as PrismaService, config);
  });

  describe('getReviewCenter', () => {
    it('maps pending items and averages my ratings', async () => {
      const deliveredAt = new Date('2026-10-18T03:00:00Z');
      prisma.orderItem.findMany.mockResolvedValue([
        {
          id: ITEM_ID,
          vendorNameSnapshot: 'Vựa Biển Xanh',
          variantNameSnapshot: 'Size 15-20',
          unitSnapshot: 'kg',
          unitPrice: '520000.00',
          quantity: '1.000',
          lineTotal: '520000.00',
          vendorOrder: {
            updatedAt: new Date('2026-10-19T00:00:00Z'),
            order: { orderNumber: 'HSE-89214' },
            shipment: { deliveredAt },
          },
          offer: { variant: { product } },
        },
      ]);
      prisma.review.findMany.mockResolvedValue([reviewRow({ rating: 5 }), reviewRow({ id: 'r2', rating: 4 })]);

      const center = await service.getReviewCenter(USER_ID);

      expect(center.stats).toEqual({ pendingCount: 1, submittedCount: 2, averageRating: 4.5 });
      expect(center.anonymousName).toBe('n***n');
      expect(center.imageUploadEnabled).toBe(true);
      expect(center.pending[0]).toMatchObject({
        orderNumber: 'HSE-89214',
        deliveredAt: deliveredAt.toISOString(),
        unitPrice: 520000,
        product: { slug: 'tom-su', imageUrl: 'https://img/tom.jpg' },
      });
      // Only delivered items without a review, from my own orders.
      expect(prisma.orderItem.findMany.mock.calls[0][0].where).toEqual({
        review: { is: null },
        vendorOrder: { status: 'COMPLETED', order: { userId: USER_ID } },
      });
    });
  });

  describe('createReview', () => {
    it('creates the review with its images in order', async () => {
      prisma.orderItem.findFirst.mockResolvedValue(orderItem());
      prisma.review.create.mockResolvedValue(reviewRow({ images: [{ imageUrl: OWN_IMAGE }] }));

      const review = await service.createReview(USER_ID, {
        ...input,
        highlights: ['on-time'],
        isAnonymous: true,
        imageUrls: [OWN_IMAGE],
      });

      expect(prisma.review.create.mock.calls[0][0].data).toMatchObject({
        userId: USER_ID,
        productId: 'p1',
        orderItemId: ITEM_ID,
        highlights: ['on-time'],
        isAnonymous: true,
        images: { create: [{ imageUrl: OWN_IMAGE, sortOrder: 0 }] },
      });
      expect(review.imageUrls).toEqual([OWN_IMAGE]);
      expect(review.orderNumber).toBe('HSE-1');
    });

    it("rejects order items that are not mine", async () => {
      prisma.orderItem.findFirst.mockResolvedValue(null);
      await expect(service.createReview(USER_ID, input)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.orderItem.findFirst.mock.calls[0][0].where).toEqual({
        id: ITEM_ID,
        vendorOrder: { order: { userId: USER_ID } },
      });
    });

    it('rejects orders that are not delivered yet', async () => {
      prisma.orderItem.findFirst.mockResolvedValue(orderItem({ vendorOrder: { status: 'SHIPPING' } }));
      await expect(service.createReview(USER_ID, input)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a second review of the same item', async () => {
      prisma.orderItem.findFirst.mockResolvedValue(orderItem({ review: { id: 'r1' } }));
      await expect(service.createReview(USER_ID, input)).rejects.toBeInstanceOf(ConflictException);
    });

    it('turns a concurrent duplicate into a conflict', async () => {
      prisma.orderItem.findFirst.mockResolvedValue(orderItem());
      prisma.review.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
      await expect(service.createReview(USER_ID, input)).rejects.toBeInstanceOf(ConflictException);
    });

    it.each([
      ['another customer folder', OWN_IMAGE.replace(USER_ID, 'someone-else')],
      ['another cloud', OWN_IMAGE.replace('demo-cloud', 'other-cloud')],
      ['a non-Cloudinary host', 'https://evil.example.com/a.jpg'],
      ['a nested path', OWN_IMAGE.replace('abc123.jpg', 'x/abc123.jpg')],
    ])('rejects images from %s', async (_label, url) => {
      prisma.orderItem.findFirst.mockResolvedValue(orderItem());
      await expect(service.createReview(USER_ID, { ...input, imageUrls: [url] })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.review.create).not.toHaveBeenCalled();
    });
  });

  describe('createUploadSignature', () => {
    it('signs an upload into my own folder', () => {
      const result = service.createUploadSignature(USER_ID);
      expect(result.folder).toBe(`haisan-express/reviews/${USER_ID}`);
      expect(result.uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
      expect(result.signature).toBe(
        signCloudinaryParams(
          { allowed_formats: result.allowedFormats, folder: result.folder, timestamp: result.timestamp },
          'secret',
        ),
      );
    });

    it('is unavailable until Cloudinary is configured', () => {
      cloudinary = { cloudName: '', apiKey: '', apiSecret: '' };
      expect(() => service.createUploadSignature(USER_ID)).toThrow(ServiceUnavailableException);
    });
  });
});

describe('signCloudinaryParams', () => {
  it('hashes the sorted params followed by the secret', () => {
    const expected = createHash('sha1').update('folder=a&timestamp=1secret').digest('hex');
    expect(signCloudinaryParams({ timestamp: 1, folder: 'a' }, 'secret')).toBe(expected);
  });
});

describe('anonymizeName', () => {
  it('keeps only the first and last letters', () => {
    expect(anonymizeName('Nguyễn Văn An')).toBe('n***n');
    expect(anonymizeName('  ')).toBe('***');
  });
});

describe('CreateReviewDto', () => {
  const check = (body: Record<string, unknown>) =>
    validate(plainToInstance(CreateReviewDto, { ...input, ...body }));

  it('accepts a minimal review', async () => {
    expect(await check({})).toHaveLength(0);
  });

  it.each([
    ['rating 0', { rating: 0 }],
    ['rating 6', { rating: 6 }],
    ['short content', { content: '  ngon  ' }],
    ['long content', { content: 'a'.repeat(501) }],
    ['unknown highlight', { highlights: ['cheap'] }],
    ['six images', { imageUrls: Array.from({ length: 6 }, (_, i) => `https://res.cloudinary.com/x/${i}.jpg`) }],
    ['http image', { imageUrls: ['http://res.cloudinary.com/x/a.jpg'] }],
  ])('rejects %s', async (_label, body) => {
    expect((await check(body)).length).toBeGreaterThan(0);
  });
});
