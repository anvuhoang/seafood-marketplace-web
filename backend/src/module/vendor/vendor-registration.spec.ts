import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { readdirSync } from 'node:fs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ADMINISTRATIVE_UNIT_MESSAGES,
  AdministrativeUnitService,
} from '../administrative-unit/administrative-unit.service.js';
import { RegisterVendorDto } from './dto/vendor-registration.dto.js';
import { VendorRegistrationController } from './vendor-registration.controller.js';
import {
  RESERVED_VENDOR_SLUGS,
  VENDOR_REGISTRATION_MESSAGES,
  VendorRegistrationService,
  slugify,
} from './vendor-registration.service.js';

const USER_ID = 'b3f1c2d4-0000-4000-8000-000000000001';

// Real GSO codes: Kiên Giang (91) → Phú Quốc (911) → An Thới (31081); Cà Mau (96) → Năm Căn (971).
const KIEN_GIANG = '91';
const PHU_QUOC = '911';
const AN_THOI = '31081';
const CA_MAU = '96';
const NAM_CAN = '971';

const validBody = (overrides: Record<string, unknown> = {}) => ({
  name: 'Vựa Hải Sản Bến Cảng An Thới',
  contactPhone: '0912345678',
  provinceCode: KIEN_GIANG,
  districtCode: PHU_QUOC,
  wardCode: AN_THOI,
  streetAddress: 'Khu neo đậu số 4, cầu cảng An Thới',
  description: 'Tôm hùm, ghẹ và mực câu trong ngày.',
  ...overrides,
});

const vendorRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'vendor-1',
  name: 'Vựa Hải Sản Bến Cảng An Thới',
  slug: 'vua-hai-san-ben-cang-an-thoi',
  phone: '0912345678',
  province: 'Kiên Giang',
  district: 'Phú Quốc',
  ward: 'An Thới',
  streetAddress: 'Khu neo đậu số 4, cầu cảng An Thới',
  description: null,
  status: 'PENDING',
  createdAt: new Date('2026-11-17T08:00:00.000Z'),
  updatedAt: new Date('2026-11-17T08:00:00.000Z'),
  decisions: [],
  ...overrides,
});

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

/** Same pipe settings as main.ts. */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const toDto = (body: Record<string, unknown>) =>
  pipe.transform(body, { type: 'body', metatype: RegisterVendorDto, data: '' }) as Promise<RegisterVendorDto>;

/** Asserts the pipe answers 400, then returns the failing property names and messages. */
async function badRequestFields(body: Record<string, unknown>): Promise<string> {
  await expect(toDto(body)).rejects.toBeInstanceOf(BadRequestException);
  const errors = await validate(plainToInstance(RegisterVendorDto, body), { whitelist: true, forbidNonWhitelisted: true });
  return JSON.stringify(errors.map((e) => [e.property, Object.values(e.constraints ?? {})]));
}

const units = new AdministrativeUnitService();

function createPrisma() {
  return {
    user: { findUnique: vi.fn(), update: vi.fn() },
    vendor: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  };
}

describe('Vendor registration', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let service: VendorRegistrationService;

  /** Account lookups in call order: register() checks role/status, then getMyRegistration() reads the result. */
  const account = (role = 'CUSTOMER', status = 'ACTIVE', vendorAfter: Record<string, unknown> | null = vendorRow()) => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ role, status })
      .mockResolvedValueOnce({ role, vendor: vendorAfter });
  };

  beforeEach(() => {
    prisma = createPrisma();
    service = new VendorRegistrationService(prisma as unknown as PrismaService, units);
    prisma.vendor.findMany.mockResolvedValue([]);
    prisma.vendor.findUnique.mockResolvedValue(null);
    prisma.vendor.create.mockResolvedValue(vendorRow());
  });

  describe('POST /vendors/registration', () => {
    it('creates a PENDING store owned by the caller and leaves the role alone', async () => {
      account();

      const result = await service.register(USER_ID, await toDto(validBody()));

      expect(prisma.vendor.create).toHaveBeenCalledWith({
        data: {
          ownerId: USER_ID,
          slug: 'vua-hai-san-ben-cang-an-thoi',
          status: 'PENDING',
          name: 'Vựa Hải Sản Bến Cảng An Thới',
          phone: '0912345678',
          province: 'Kiên Giang',
          district: 'Phú Quốc',
          ward: 'An Thới',
          streetAddress: 'Khu neo đậu số 4, cầu cảng An Thới',
          description: 'Tôm hùm, ghẹ và mực câu trong ngày.',
        },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: 'PENDING', accountRole: 'CUSTOMER', rejectionReason: null });
    });

    it('stores phone numbers given as +84 in the 0... form', async () => {
      account();
      await service.register(USER_ID, await toDto(validBody({ contactPhone: '+84 912.345-678' })));
      expect(prisma.vendor.create.mock.calls[0][0].data.phone).toBe('0912345678');
    });

    it('accepts an empty ward and stores null', async () => {
      account();
      await service.register(USER_ID, await toDto(validBody({ wardCode: '' })));
      expect(prisma.vendor.create.mock.calls[0][0].data.ward).toBeNull();
    });

    it.each(['PENDING', 'ACTIVE', 'SUSPENDED'])('answers 409 when the account already has a %s store', async (status) => {
      account();
      prisma.vendor.findUnique.mockResolvedValue({ id: 'vendor-1', status });

      await expect(service.register(USER_ID, await toDto(validBody()))).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.vendor.create).not.toHaveBeenCalled();
      expect(prisma.vendor.updateMany).not.toHaveBeenCalled();
    });

    it('answers 409 when a concurrent request created the store first (P2002 on owner_id)', async () => {
      account();
      // The pre-check sees nothing, the insert loses the race, the re-check finds the winner.
      prisma.vendor.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'vendor-1' });
      prisma.vendor.create.mockRejectedValue(p2002());

      await expect(service.register(USER_ID, await toDto(validBody()))).rejects.toThrow(
        new ConflictException(VENDOR_REGISTRATION_MESSAGES.exists),
      );
    });

    it('retries with the next slug when another store took the same slug concurrently', async () => {
      account();
      prisma.vendor.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ slug: 'vua-hai-san-ben-cang-an-thoi' }]);
      prisma.vendor.create.mockRejectedValueOnce(p2002()).mockResolvedValueOnce(vendorRow());

      await service.register(USER_ID, await toDto(validBody()));

      expect(prisma.vendor.create).toHaveBeenCalledTimes(2);
      expect(prisma.vendor.create.mock.calls[1][0].data.slug).toBe('vua-hai-san-ben-cang-an-thoi-2');
    });

    it('rethrows database errors other than P2002', async () => {
      account();
      prisma.vendor.create.mockRejectedValue(new Error('connection lost'));
      await expect(service.register(USER_ID, await toDto(validBody()))).rejects.toThrow('connection lost');
    });

    it('never assigns a slug taken by a frontend /vendor/ route', async () => {
      account();
      await service.register(USER_ID, await toDto(validBody({ name: 'Register' })));
      expect(prisma.vendor.create.mock.calls[0][0].data.slug).toBe('register-2');
    });

    it('answers 403 for an admin account', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ role: 'ADMIN', status: 'ACTIVE' });
      await expect(service.register(USER_ID, await toDto(validBody()))).rejects.toThrow(
        new ForbiddenException(VENDOR_REGISTRATION_MESSAGES.admin),
      );
    });

    it.each(['INACTIVE', 'SUSPENDED'])('answers 403 for a %s account', async (status) => {
      prisma.user.findUnique.mockResolvedValueOnce({ role: 'CUSTOMER', status });
      await expect(service.register(USER_ID, await toDto(validBody()))).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.vendor.create).not.toHaveBeenCalled();
    });

    describe('resubmitting a rejected application', () => {
      it('updates the same record back to PENDING with the new details, keeping the slug', async () => {
        account();
        prisma.vendor.findUnique.mockResolvedValue({ id: 'vendor-1', status: 'REJECTED' });
        prisma.vendor.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.register(USER_ID, await toDto(validBody({ name: 'Tên mới', wardCode: null })));

        expect(prisma.vendor.updateMany).toHaveBeenCalledWith({
          where: { id: 'vendor-1', status: 'REJECTED' },
          data: expect.objectContaining({ name: 'Tên mới', ward: null, status: 'PENDING' }),
        });
        expect(prisma.vendor.updateMany.mock.calls[0][0].data).not.toHaveProperty('slug');
        expect(prisma.vendor.create).not.toHaveBeenCalled();
        expect(prisma.user.update).not.toHaveBeenCalled();
        expect(result.status).toBe('PENDING');
      });

      it('answers 409 when an admin changed the status in the meantime', async () => {
        account();
        prisma.vendor.findUnique.mockResolvedValue({ id: 'vendor-1', status: 'REJECTED' });
        prisma.vendor.updateMany.mockResolvedValue({ count: 0 });

        await expect(service.register(USER_ID, await toDto(validBody()))).rejects.toThrow(
          new ConflictException(VENDOR_REGISTRATION_MESSAGES.changed),
        );
      });
    });

    describe('address', () => {
      it.each([
        ['province', { provinceCode: undefined }],
        ['district', { districtCode: undefined }],
        ['province', { provinceCode: '' }],
      ])('rejects a missing %s with 400', async (field, overrides) => {
        expect(await badRequestFields(validBody(overrides))).toContain(field === 'province' ? 'tỉnh' : 'quận');
      });

      it('rejects a district that is not in the chosen province', async () => {
        prisma.user.findUnique.mockResolvedValueOnce({ role: 'CUSTOMER', status: 'ACTIVE' });
        await expect(
          service.register(USER_ID, await toDto(validBody({ provinceCode: CA_MAU, districtCode: PHU_QUOC, wardCode: null }))),
        ).rejects.toThrow(new BadRequestException(ADMINISTRATIVE_UNIT_MESSAGES.district));
        expect(prisma.vendor.create).not.toHaveBeenCalled();
      });

      it('rejects a ward that is not in the chosen district', async () => {
        prisma.user.findUnique.mockResolvedValueOnce({ role: 'CUSTOMER', status: 'ACTIVE' });
        await expect(
          service.register(USER_ID, await toDto(validBody({ provinceCode: CA_MAU, districtCode: NAM_CAN, wardCode: AN_THOI }))),
        ).rejects.toThrow(new BadRequestException(ADMINISTRATIVE_UNIT_MESSAGES.ward));
      });

      it('rejects codes that do not exist', async () => {
        prisma.user.findUnique.mockResolvedValueOnce({ role: 'CUSTOMER', status: 'ACTIVE' });
        await expect(
          service.register(USER_ID, await toDto(validBody({ provinceCode: '99' }))),
        ).rejects.toThrow(new BadRequestException(ADMINISTRATIVE_UNIT_MESSAGES.province));
      });
    });
  });

  describe('validation (400)', () => {
    it.each([
      ['missing name', { name: undefined }, 'name'],
      ['blank name', { name: '   ' }, 'name'],
      ['one-letter name', { name: 'A' }, 'name'],
      ['name over 120 characters', { name: 'a'.repeat(121) }, 'name'],
      ['invalid phone', { contactPhone: '12345' }, 'contactPhone'],
      ['phone with letters', { contactPhone: '09123abc78' }, 'contactPhone'],
      ['phone as 84... without +', { contactPhone: '84912345678' }, 'contactPhone'],
      ['missing street address', { streetAddress: '' }, 'streetAddress'],
      ['street address over 255 characters', { streetAddress: 'a'.repeat(256) }, 'streetAddress'],
      ['description over 1000 characters', { description: 'a'.repeat(1001) }, 'description'],
      ['status sent by the client', { status: 'ACTIVE' }, 'status'],
      ['ownerId sent by the client', { ownerId: 'someone-else' }, 'ownerId'],
    ])('%s', async (_label, overrides, field) => {
      expect(await badRequestFields(validBody(overrides))).toContain(field);
    });

    it('accepts both 0... and +84... phone numbers and landlines', async () => {
      await expect(toDto(validBody({ contactPhone: '+84912345678' }))).resolves.toMatchObject({ contactPhone: '0912345678' });
      await expect(toDto(validBody({ contactPhone: '0297 3844 990' }))).resolves.toMatchObject({ contactPhone: '02973844990' });
    });

    it('trims text and turns an empty description into null', async () => {
      await expect(toDto(validBody({ name: '  Vựa Biển  ', description: '  ' }))).resolves.toMatchObject({
        name: 'Vựa Biển',
        description: null,
      });
    });
  });

  describe('GET /vendors/registration/me', () => {
    it('returns NONE when nothing was submitted', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER', vendor: null });
      await expect(service.getMyRegistration(USER_ID)).resolves.toEqual({
        status: 'NONE',
        accountRole: 'CUSTOMER',
        application: null,
        rejectionReason: null,
      });
    });

    it('returns the submitted application with catalogue codes for pre-filling', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER', vendor: vendorRow() });

      const result = await service.getMyRegistration(USER_ID);

      expect(result.status).toBe('PENDING');
      expect(result.application).toMatchObject({
        name: 'Vựa Hải Sản Bến Cảng An Thới',
        contactPhone: '0912345678',
        provinceCode: KIEN_GIANG,
        districtCode: PHU_QUOC,
        wardCode: AN_THOI,
        createdAt: new Date('2026-11-17T08:00:00.000Z'),
      });
      expect(result.rejectionReason).toBeNull();
    });

    it('returns the reason of the latest rejection while REJECTED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'CUSTOMER',
        vendor: vendorRow({ status: 'REJECTED', decisions: [{ reason: 'Địa chỉ kho chưa rõ ràng.' }] }),
      });

      const result = await service.getMyRegistration(USER_ID);

      expect(result).toMatchObject({ status: 'REJECTED', rejectionReason: 'Địa chỉ kho chưa rõ ràng.' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            vendor: expect.objectContaining({
              select: expect.objectContaining({
                decisions: { where: { action: 'REJECT' }, orderBy: { createdAt: 'desc' }, take: 1, select: { reason: true } },
              }),
            }),
          }),
        }),
      );
    });

    it.each([
      ['ACTIVE', 'VENDOR'],
      ['SUSPENDED', 'CUSTOMER'],
      ['PENDING', 'CUSTOMER'],
    ])('returns %s without a rejection reason, even if an older rejection exists', async (status, role) => {
      prisma.user.findUnique.mockResolvedValue({
        role,
        vendor: vendorRow({ status, decisions: [{ reason: 'Lý do cũ' }] }),
      });

      await expect(service.getMyRegistration(USER_ID)).resolves.toMatchObject({
        status,
        accountRole: role,
        rejectionReason: null,
      });
    });

    it('leaves codes null for hand-entered names that are not in the catalogue', async () => {
      prisma.user.findUnique.mockResolvedValue({
        role: 'VENDOR',
        vendor: vendorRow({ status: 'ACTIVE', province: 'Kiên Giang', district: 'Không có', ward: null }),
      });

      const result = await service.getMyRegistration(USER_ID);

      expect(result.application).toMatchObject({ provinceCode: KIEN_GIANG, districtCode: null, wardCode: null });
    });
  });

  describe('slugs', () => {
    it('drops Vietnamese diacritics and punctuation', () => {
      expect(slugify('Vựa Hải Sản Đất Mũi!')).toBe('vua-hai-san-dat-mui');
      expect(slugify('  ***  ')).toBe('');
    });

    it('reserves every first-level route folder under frontend app/vendor/, including route groups', () => {
      const vendorApp = new URL('../../../../frontend/src/app/vendor/', import.meta.url);
      const routeNames = (dir: URL): string[] =>
        readdirSync(dir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .flatMap((entry) => {
            if (/^\(.+\)$/.test(entry.name)) return routeNames(new URL(`${entry.name}/`, dir)); // (group): no URL segment
            if (/^\[.+\]$/.test(entry.name)) return []; // [slug]: the storefront itself
            return [entry.name];
          });

      expect([...RESERVED_VENDOR_SLUGS].sort()).toEqual(routeNames(vendorApp).sort());
    });
  });
});

describe('Vendor registration over HTTP', () => {
  let app: INestApplication;
  let token: string;
  const registration = { register: vi.fn(), getMyRegistration: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ jwtSecret: 'x'.repeat(64), jwtExpiresIn: '1h' })],
        }),
        AuthModule,
      ],
      controllers: [VendorRegistrationController],
      providers: [{ provide: VendorRegistrationService, useValue: registration }],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(pipe);
    await app.init();
    token = await moduleRef.get(JwtService).signAsync({ sub: USER_ID, email: 'a@example.com', role: 'CUSTOMER' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    registration.register.mockReset().mockResolvedValue({ status: 'PENDING' });
    registration.getMyRegistration.mockReset().mockResolvedValue({ status: 'NONE' });
  });

  it('answers 401 without a token', async () => {
    await request(app.getHttpServer()).post('/vendors/registration').send(validBody()).expect(401);
    await request(app.getHttpServer()).get('/vendors/registration/me').expect(401);
    expect(registration.register).not.toHaveBeenCalled();
  });

  it('answers 400 for unknown fields before reaching the service', async () => {
    await request(app.getHttpServer())
      .post('/vendors/registration')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody({ status: 'ACTIVE', ownerId: 'x' }))
      .expect(400);
    expect(registration.register).not.toHaveBeenCalled();
  });

  it('answers 201 and passes the token owner, never a client id, to the service', async () => {
    await request(app.getHttpServer())
      .post('/vendors/registration')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody())
      .expect(201);
    expect(registration.register).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ provinceCode: KIEN_GIANG }));
  });
});
