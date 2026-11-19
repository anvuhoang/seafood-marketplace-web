import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ArgumentMetadata,
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CloudinaryService, signCloudinaryParams } from '../../common/cloudinary/cloudinary.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateVendorStoreDto } from './dto/vendor-store.dto.js';
import { VendorController } from './vendor.controller.js';
import {
  VENDOR_STORE_INVALID_IMAGE,
  VENDOR_STORE_NOT_FOUND,
  VendorService,
  vendorUploadFolder,
} from './vendor.service.js';

const OWNER_ID = 'owner-a';
const VENDOR_ID = 'vendor-a';
const CLOUD = { cloudName: 'demo-cloud', apiKey: 'key', apiSecret: 'secret' };
const OWN_IMAGE = `https://res.cloudinary.com/demo-cloud/image/upload/v1730000000/haisan-express/vendors/${VENDOR_ID}/logo_1.png`;

const storeRow = (overrides: Record<string, unknown> = {}) => ({
  id: VENDOR_ID,
  name: 'Vựa Thủy Sản Phú Quốc Xanh',
  slug: 'vua-thuy-san-phu-quoc-xanh',
  description: 'Mô tả vựa',
  logoUrl: null,
  coverUrl: 'https://images.unsplash.com/seed-cover.jpg',
  phone: '0908123456',
  email: 'vua@phuquocxanh.vn',
  province: 'Kiên Giang',
  district: 'Phú Quốc',
  ward: null,
  streetAddress: '12 Bến Cảng',
  status: 'ACTIVE',
  updatedAt: new Date('2026-11-17T08:00:00.000Z'),
  ...overrides,
});

/** Same pipe settings as main.ts. */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const bodyMeta: ArgumentMetadata = { type: 'body', metatype: UpdateVendorStoreDto, data: '' };

async function fieldErrors(body: Record<string, unknown>): Promise<Record<string, string[]>> {
  const errors = await validate(plainToInstance(UpdateVendorStoreDto, body));
  return Object.fromEntries(errors.map((e) => [e.property, Object.values(e.constraints ?? {})]));
}

describe('Vendor store profile', () => {
  let service: VendorService;
  let cloudinary: typeof CLOUD | undefined;
  let prisma: { vendor: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    cloudinary = CLOUD;
    prisma = { vendor: { findUnique: vi.fn(), update: vi.fn() } };
    const config = { get: vi.fn(() => cloudinary) } as unknown as ConfigService;
    service = new VendorService(prisma as unknown as PrismaService, new CloudinaryService(config));
    prisma.vendor.findUnique.mockResolvedValue(storeRow());
    prisma.vendor.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(storeRow(data)),
    );
  });

  describe('route guards', () => {
    const handlers = [
      VendorController.prototype.getMyStore,
      VendorController.prototype.updateMyStore,
      VendorController.prototype.createStoreUploadSignature,
    ];

    it.each(handlers.map((h) => [h.name, h]))('%s is VENDOR-only', async (_name, handler) => {
      const reflector = new Reflector();
      expect(reflector.getAllAndOverride<string[]>(ROLES_KEY, [handler, VendorController])).toEqual(['VENDOR']);

      const findUnique = vi.fn();
      const guard = new RolesGuard(reflector, { user: { findUnique } } as unknown as PrismaService);
      const asRole = (role: string) => {
        findUnique.mockResolvedValue({ role, status: 'ACTIVE' });
        return guard.canActivate({
          getHandler: () => handler,
          getClass: () => VendorController,
          switchToHttp: () => ({ getRequest: () => ({ user: { sub: OWNER_ID, role } }) }),
        } as unknown as ExecutionContext);
      };
      await expect(asRole('VENDOR')).resolves.toBe(true);
      await expect(asRole('CUSTOMER')).rejects.toThrow(ForbiddenException);
      await expect(asRole('ADMIN')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMyStore', () => {
    it('returns my own store, looked up by owner', async () => {
      const result = await service.getMyStore(OWNER_ID);

      expect(prisma.vendor.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: OWNER_ID } }),
      );
      expect(result).toEqual({
        id: VENDOR_ID,
        name: 'Vựa Thủy Sản Phú Quốc Xanh',
        slug: 'vua-thuy-san-phu-quoc-xanh',
        description: 'Mô tả vựa',
        logoUrl: null,
        coverUrl: 'https://images.unsplash.com/seed-cover.jpg',
        phone: '0908123456',
        email: 'vua@phuquocxanh.vn',
        province: 'Kiên Giang',
        district: 'Phú Quốc',
        ward: null,
        streetAddress: '12 Bến Cảng',
        status: 'ACTIVE',
        updatedAt: '2026-11-17T08:00:00.000Z',
        imageUploadEnabled: true,
      });
    });

    it('reports image upload as disabled until Cloudinary is configured', async () => {
      cloudinary = undefined;
      expect((await service.getMyStore(OWNER_ID)).imageUploadEnabled).toBe(false);
    });

    it('is 404 when the account has no store', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.getMyStore(OWNER_ID)).rejects.toThrow(new NotFoundException(VENDOR_STORE_NOT_FOUND));
    });
  });

  describe('updateMyStore', () => {
    it('only touches the store owned by the signed-in user', async () => {
      const result = await service.updateMyStore(OWNER_ID, { name: 'Vựa Mới', district: 'An Thới' });

      expect(prisma.vendor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: OWNER_ID },
          data: { name: 'Vựa Mới', district: 'An Thới' },
        }),
      );
      expect(result.name).toBe('Vựa Mới');
      expect(result.district).toBe('An Thới');
    });

    it('is 404 without a store and never updates', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.updateMyStore(OWNER_ID, { name: 'Vựa Mới' })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.vendor.update).not.toHaveBeenCalled();
    });

    it('never writes slug or status, even if they reach the service', async () => {
      const sneaky = { name: 'Vựa Mới', slug: 'hijack', status: 'ACTIVE', ownerId: 'someone' };
      await service.updateMyStore(OWNER_ID, sneaky as UpdateVendorStoreDto);

      const { data } = prisma.vendor.update.mock.calls[0]![0] as { data: Record<string, unknown> };
      expect(data).toEqual({ name: 'Vựa Mới' });
    });

    it('rejects slug and status at the validation pipe', async () => {
      await expect(pipe.transform({ name: 'Vựa Mới', slug: 'hijack' }, bodyMeta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(pipe.transform({ status: 'ACTIVE' }, bodyMeta)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('is 403 while the store is suspended', async () => {
      prisma.vendor.findUnique.mockResolvedValue(storeRow({ status: 'SUSPENDED' }));
      await expect(service.updateMyStore(OWNER_ID, { name: 'Vựa Mới' })).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.vendor.update).not.toHaveBeenCalled();
    });

    it.each(['PENDING', 'REJECTED', 'ACTIVE'])('lets a %s store edit its profile', async (status) => {
      prisma.vendor.findUnique.mockResolvedValue(storeRow({ status }));
      prisma.vendor.update.mockResolvedValue(storeRow({ status, name: 'Vựa Mới' }));
      await expect(service.updateMyStore(OWNER_ID, { name: 'Vựa Mới' })).resolves.toMatchObject({
        status,
        name: 'Vựa Mới',
      });
      expect(prisma.vendor.update).toHaveBeenCalledOnce();
    });

    it('accepts images uploaded into my store folder', async () => {
      const cover = OWN_IMAGE.replace('logo_1.png', 'cover.jpg');
      await service.updateMyStore(OWNER_ID, { logoUrl: OWN_IMAGE, coverUrl: cover });
      expect(prisma.vendor.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { logoUrl: OWN_IMAGE, coverUrl: cover } }),
      );
    });

    it.each([
      ['an unknown host', 'https://evil.example.com/logo.png'],
      ['another vendor folder', OWN_IMAGE.replace(VENDOR_ID, 'vendor-b')],
      ['another cloud', OWN_IMAGE.replace('demo-cloud', 'other-cloud')],
      ['the review folder', OWN_IMAGE.replace(`vendors/${VENDOR_ID}`, `reviews/${OWNER_ID}`)],
    ])('rejects a logo from %s', async (_label, url) => {
      await expect(service.updateMyStore(OWNER_ID, { logoUrl: url })).rejects.toThrow(
        new BadRequestException(VENDOR_STORE_INVALID_IMAGE),
      );
      await expect(service.updateMyStore(OWNER_ID, { coverUrl: url })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.vendor.update).not.toHaveBeenCalled();
    });

    it('removes images with null', async () => {
      prisma.vendor.findUnique.mockResolvedValue(storeRow({ logoUrl: OWN_IMAGE }));
      const result = await service.updateMyStore(OWNER_ID, { logoUrl: null, coverUrl: null });
      expect(prisma.vendor.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { logoUrl: null, coverUrl: null } }),
      );
      expect(result.logoUrl).toBeNull();
      expect(result.coverUrl).toBeNull();
    });

    it('lets the stored image be sent back unchanged', async () => {
      // The seeded cover is not on Cloudinary; saving other fields must not fail on it.
      await expect(
        service.updateMyStore(OWNER_ID, { coverUrl: 'https://images.unsplash.com/seed-cover.jpg', name: 'Vựa Mới' }),
      ).resolves.toMatchObject({ name: 'Vựa Mới' });
    });

    it('rejects new images while Cloudinary is not configured', async () => {
      cloudinary = undefined;
      await expect(service.updateMyStore(OWNER_ID, { logoUrl: OWN_IMAGE })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('createStoreUploadSignature', () => {
    it('signs an upload into my store folder', async () => {
      const result = await service.createStoreUploadSignature(OWNER_ID);

      expect(result.folder).toBe(`haisan-express/vendors/${VENDOR_ID}`);
      expect(result.folder).toBe(vendorUploadFolder(VENDOR_ID));
      expect(result.allowedFormats).toBe('jpg,jpeg,png,webp');
      expect(result.maxFileSizeBytes).toBe(5 * 1024 * 1024);
      expect(result.signature).toBe(
        signCloudinaryParams(
          { allowed_formats: result.allowedFormats, folder: result.folder, timestamp: result.timestamp },
          'secret',
        ),
      );
    });

    it('is 404 without a store', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.createStoreUploadSignature(OWNER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is 503 until Cloudinary is configured', async () => {
      cloudinary = { cloudName: '', apiKey: '', apiSecret: '' };
      await expect(service.createStoreUploadSignature(OWNER_ID)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});

describe('UpdateVendorStoreDto', () => {
  it('accepts a valid partial update and trims text', async () => {
    const dto = plainToInstance(UpdateVendorStoreDto, { name: '  Vựa Mới  ', phone: '+84908123456' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.name).toBe('Vựa Mới');
  });

  it('accepts an empty body', async () => {
    expect(await fieldErrors({})).toEqual({});
  });

  it.each([
    ['an empty name', { name: '   ' }, 'name'],
    ['a one-letter name', { name: 'A' }, 'name'],
    ['a 181-letter name', { name: 'a'.repeat(181) }, 'name'],
    ['a null name', { name: null }, 'name'],
    ['a bad email', { email: 'not-an-email' }, 'email'],
    ['a bad phone', { phone: '12345' }, 'phone'],
    ['a foreign phone', { phone: '+1 555 0100' }, 'phone'],
    ['a long description', { description: 'a'.repeat(2001) }, 'description'],
    ['an empty province', { province: '' }, 'province'],
    ['a null district', { district: null }, 'district'],
    ['a long ward', { ward: 'a'.repeat(101) }, 'ward'],
    ['an empty street address', { streetAddress: '  ' }, 'streetAddress'],
    ['a long logo URL', { logoUrl: `https://x/${'a'.repeat(1000)}` }, 'logoUrl'],
  ])('rejects %s', async (_label, body, field) => {
    const errors = await fieldErrors(body);
    expect(Object.keys(errors)).toEqual([field]);
  });

  it('returns Vietnamese messages', async () => {
    const errors = await fieldErrors({ name: '', email: 'x', phone: '1' });
    expect(errors.name).toContain('Vui lòng nhập tên gian hàng.');
    expect(errors.email).toContain('Email không hợp lệ.');
    expect(errors.phone).toContain('Số điện thoại không hợp lệ (ví dụ: 0912345678).');
  });

  it('lets optional fields be cleared with null or an empty string', async () => {
    const dto = plainToInstance(UpdateVendorStoreDto, {
      description: '',
      phone: null,
      email: '  ',
      ward: null,
      logoUrl: null,
      coverUrl: null,
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ description: null, phone: null, email: null, ward: null, logoUrl: null, coverUrl: null });
  });
});
