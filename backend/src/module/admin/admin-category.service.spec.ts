import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminCategoryService } from './admin-category.service.js';
import { AdminCategoryController } from './admin-category.controller.js';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'cat-1',
  name: 'Tôm sống',
  slug: 'tom-song',
  description: null,
  imageUrl: null,
  parentId: null,
  sortOrder: 0,
  isActive: true,
  parent: null,
  _count: { products: 0, children: 0 },
  ...overrides,
});

describe('AdminCategoryService', () => {
  let service: AdminCategoryService;
  let tx: {
    category: { findUnique: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  };
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    category: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    tx = { category: { findUnique: vi.fn(), delete: vi.fn() } };
    prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
      category: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    service = new AdminCategoryService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    const rows = [
      row({ id: 'a', name: 'Tôm sống', isActive: true }),
      row({ id: 'b', name: 'Cá biển', slug: 'ca-bien', isActive: false }),
      row({ id: 'c', name: 'Mực', slug: 'muc', isActive: true, parentId: 'b', parent: { name: 'Cá biển', isActive: false } }),
    ];

    it('includes inactive categories and counts every status', async () => {
      prisma.category.findMany.mockResolvedValue(rows);

      const result = await service.list({});

      expect(result.items).toHaveLength(3);
      expect(result.counts).toEqual({ total: 3, active: 2, inactive: 1 });
      expect(prisma.category.findMany.mock.calls[0]![0].where).toBeUndefined();
    });

    it('flags an active category whose parent is inactive as hidden', async () => {
      prisma.category.findMany.mockResolvedValue(rows);

      const result = await service.list({});

      expect(result.items.find((item) => item.id === 'c')?.hiddenByParent).toBe(true);
      expect(result.items.find((item) => item.id === 'a')?.hiddenByParent).toBe(false);
    });

    it('filters by status and by name without regard to accents, keeping the counts whole', async () => {
      prisma.category.findMany.mockResolvedValue(rows);

      const inactive = await service.list({ status: 'INACTIVE' });
      expect(inactive.items.map((item) => item.id)).toEqual(['b']);
      expect(inactive.counts.total).toBe(3);

      const search = await service.list({ q: 'tom' });
      expect(search.items.map((item) => item.id)).toEqual(['a']);
    });
  });

  describe('create', () => {
    it('generates a slug from the name and returns the category', async () => {
      prisma.category.create.mockResolvedValue(row({ name: 'Cua ghẹ', slug: 'cua-ghe' }));

      const result = await service.create({ name: 'Cua ghẹ' });

      expect(prisma.category.create.mock.calls[0]![0].data).toMatchObject({ name: 'Cua ghẹ', slug: 'cua-ghe', parentId: null });
      expect(result.slug).toBe('cua-ghe');
    });

    it('picks the next free slug when the base is taken', async () => {
      prisma.category.findMany.mockImplementation(async (args: { where: { slug?: unknown } }) =>
        args.where.slug ? [{ slug: 'tom-song' }, { slug: 'tom-song-2' }] : [],
      );
      prisma.category.create.mockResolvedValue(row({ slug: 'tom-song-3' }));

      await service.create({ name: 'Tôm Sống' });

      expect(prisma.category.create.mock.calls[0]![0].data.slug).toBe('tom-song-3');
    });

    it('refuses a name already used by a sibling, ignoring case and accents', async () => {
      prisma.category.findMany.mockResolvedValue([{ name: 'Tôm sống' }]);

      await expect(service.create({ name: 'TOM SONG' })).rejects.toThrow(ConflictException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('refuses a parent that does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.create({ name: 'Mực', parentId: 'missing' })).rejects.toThrow(BadRequestException);
    });

    it('refuses a parent that is itself a subcategory', async () => {
      prisma.category.findUnique.mockResolvedValue({ parentId: 'root' });

      await expect(service.create({ name: 'Mực', parentId: 'child' })).rejects.toThrow(BadRequestException);
    });

    it('retries with a new slug when another admin took it first', async () => {
      const { Prisma } = await import('@prisma/client');
      const clash = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
      prisma.category.create.mockRejectedValueOnce(clash).mockResolvedValueOnce(row({ slug: 'tom-song-2' }));

      const result = await service.create({ name: 'Tôm sống' });

      expect(prisma.category.create).toHaveBeenCalledTimes(2);
      expect(result.slug).toBe('tom-song-2');
    });
  });

  describe('update', () => {
    it('changes only the fields sent and keeps the slug on rename', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Tôm sống', parentId: null });
      prisma.category.update.mockResolvedValue(row({ name: 'Tôm hùm' }));

      await service.update('cat-1', { name: 'Tôm hùm' });

      const data = prisma.category.update.mock.calls[0]![0].data;
      expect(data).toEqual({ name: 'Tôm hùm' });
      expect(data).not.toHaveProperty('slug');
    });

    it('is not blocked by its own name', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Tôm sống', parentId: null });
      prisma.category.update.mockResolvedValue(row());

      await service.update('cat-1', { name: 'Tôm sống', description: 'Mô tả mới' });

      expect(prisma.category.update).toHaveBeenCalled();
    });

    it('can clear the description and image by sending null', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Tôm sống', parentId: null });
      prisma.category.update.mockResolvedValue(row());

      await service.update('cat-1', { description: null, imageUrl: null });

      expect(prisma.category.update.mock.calls[0]![0].data).toEqual({ description: null, imageUrl: null });
    });

    it('reports a missing category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('nope', { name: 'X1' })).rejects.toThrow(NotFoundException);
    });

    it('refuses to make a category its own parent', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Tôm sống', parentId: null });

      await expect(service.update('cat-1', { parentId: 'cat-1' })).rejects.toThrow(BadRequestException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('refuses to nest a category that already has subcategories', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 'cat-1', name: 'Tôm sống', parentId: null })
        .mockResolvedValueOnce({ parentId: null });
      prisma.category.count.mockResolvedValue(2);

      await expect(service.update('cat-1', { parentId: 'other' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate and reactivate', () => {
    it('deactivates an active category with a status condition', async () => {
      prisma.category.updateMany.mockResolvedValue({ count: 1 });
      prisma.category.findUniqueOrThrow.mockResolvedValue(row({ isActive: false }));

      const result = await service.deactivate('cat-1');

      expect(prisma.category.updateMany).toHaveBeenCalledWith({ where: { id: 'cat-1', isActive: true }, data: { isActive: false } });
      expect(result.isActive).toBe(false);
    });

    it('reactivates an inactive category', async () => {
      prisma.category.updateMany.mockResolvedValue({ count: 1 });
      prisma.category.findUniqueOrThrow.mockResolvedValue(row({ isActive: true }));

      await service.reactivate('cat-1');

      expect(prisma.category.updateMany).toHaveBeenCalledWith({ where: { id: 'cat-1', isActive: false }, data: { isActive: true } });
    });

    it('answers 409 when it is already in that state, 404 when it does not exist', async () => {
      prisma.category.updateMany.mockResolvedValue({ count: 0 });
      prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-1' });
      await expect(service.deactivate('cat-1')).rejects.toThrow(ConflictException);

      prisma.category.findUnique.mockResolvedValueOnce(null);
      await expect(service.deactivate('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('never deletes a category used by products', async () => {
      tx.category.findUnique.mockResolvedValue({ _count: { products: 4, children: 0 } });

      await expect(service.remove('cat-1')).rejects.toThrow(ConflictException);
      expect(tx.category.delete).not.toHaveBeenCalled();
    });

    it('never deletes a category that still has subcategories', async () => {
      tx.category.findUnique.mockResolvedValue({ _count: { products: 0, children: 1 } });

      await expect(service.remove('cat-1')).rejects.toThrow(ConflictException);
      expect(tx.category.delete).not.toHaveBeenCalled();
    });

    it('deletes an unused category', async () => {
      tx.category.findUnique.mockResolvedValue({ _count: { products: 0, children: 0 } });

      await service.remove('cat-1');

      expect(tx.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });

    it('reports a missing category', async () => {
      tx.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('AdminCategoryController access', () => {
  it('is restricted to the ADMIN role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminCategoryController)).toEqual(['ADMIN']);
  });
});
