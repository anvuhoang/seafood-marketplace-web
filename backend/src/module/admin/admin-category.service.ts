import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { slugify } from '../product/product-listing.service.js';
import type {
  AdminCategoryDto,
  AdminCategoryListDto,
  AdminCategoryListQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/admin-category.dto.js';

/** Room left under the 150-character slug column for a "-12" style suffix. */
const SLUG_BASE_MAX_LENGTH = 140;
const FALLBACK_SLUG = 'danh-muc';
const MAX_SLUG_ATTEMPTS = 3;

const categoryInclude = {
  parent: { select: { name: true, isActive: true } },
  _count: { select: { products: true, children: true } },
} satisfies Prisma.CategoryInclude;

type CategoryRow = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;

function toDto(row: CategoryRow): AdminCategoryDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    parentId: row.parentId,
    parentName: row.parent?.name ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    productCount: row._count.products,
    childCount: row._count.children,
    hiddenByParent: row.isActive && row.parent !== null && !row.parent.isActive,
  };
}

@Injectable()
export class AdminCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every category, inactive ones included. Counts ignore the filters, like the vendor tabs. */
  async list(query: AdminCategoryListQueryDto): Promise<AdminCategoryListDto> {
    const rows = await this.prisma.category.findMany({
      include: categoryInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const needle = query.q ? slugify(query.q) : '';
    const items = rows
      .filter((row) => {
        if (query.status === 'ACTIVE' && !row.isActive) return false;
        if (query.status === 'INACTIVE' && row.isActive) return false;
        return !needle || slugify(row.name).includes(needle);
      })
      .map(toDto);

    const active = rows.filter((row) => row.isActive).length;
    return { items, counts: { total: rows.length, active, inactive: rows.length - active } };
  }

  async create(dto: CreateCategoryDto): Promise<AdminCategoryDto> {
    const parentId = dto.parentId ?? null;
    await this.assertValidParent(parentId, null);
    await this.assertNameFree(dto.name, parentId, null);

    // Two admins creating "Tôm" at once can pick the same slug; the loser retries with the next free one.
    for (let attempt = 1; ; attempt++) {
      const slug = await this.uniqueSlug(dto.name);
      try {
        const row = await this.prisma.category.create({
          data: {
            name: dto.name,
            slug,
            description: dto.description ?? null,
            imageUrl: dto.imageUrl ?? null,
            parentId,
            sortOrder: dto.sortOrder ?? 0,
          },
          include: categoryInclude,
        });
        return toDto(row);
      } catch (error) {
        const slugTaken = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!slugTaken || attempt >= MAX_SLUG_ATTEMPTS) throw error;
      }
    }
  }

  /** Only the fields sent change. The slug is kept when the name changes, so links to the category keep working. */
  async update(id: string, dto: UpdateCategoryDto): Promise<AdminCategoryDto> {
    const current = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, parentId: true },
    });
    if (!current) throw new NotFoundException('Không tìm thấy danh mục.');

    const parentId = dto.parentId === undefined ? current.parentId : dto.parentId;
    const name = dto.name ?? current.name;

    if (dto.parentId !== undefined && parentId !== current.parentId) {
      await this.assertValidParent(parentId, id);
    }
    if (name !== current.name || parentId !== current.parentId) {
      await this.assertNameFree(name, parentId, id);
    }

    const data: Prisma.CategoryUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const row = await this.prisma.category.update({ where: { id }, data, include: categoryInclude });
    return toDto(row);
  }

  deactivate(id: string): Promise<AdminCategoryDto> {
    return this.setActive(id, false);
  }

  reactivate(id: string): Promise<AdminCategoryDto> {
    return this.setActive(id, true);
  }

  /**
   * Deletes a category nobody uses. A category with products is refused, because
   * removing it would silently untag those products; it is deactivated instead.
   */
  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.category.findUnique({
        where: { id },
        select: { _count: { select: { products: true, children: true } } },
      });
      if (!row) throw new NotFoundException('Không tìm thấy danh mục.');

      if (row._count.products > 0) {
        throw new ConflictException(
          `Danh mục đang được dùng bởi ${row._count.products} sản phẩm nên không thể xóa. Hãy ngừng hiển thị thay vì xóa.`,
        );
      }
      if (row._count.children > 0) {
        throw new ConflictException('Danh mục còn danh mục con nên không thể xóa. Hãy chuyển hoặc xóa danh mục con trước.');
      }

      await tx.category.delete({ where: { id } });
    });
  }

  private async setActive(id: string, isActive: boolean): Promise<AdminCategoryDto> {
    // The status is part of the condition, so two admins clicking at once cannot both "win".
    const { count } = await this.prisma.category.updateMany({
      where: { id, isActive: !isActive },
      data: { isActive },
    });

    if (count === 0) {
      const exists = await this.prisma.category.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw new NotFoundException('Không tìm thấy danh mục.');
      throw new ConflictException(isActive ? 'Danh mục đang hiển thị rồi.' : 'Danh mục đã ngừng hiển thị rồi.');
    }

    const row = await this.prisma.category.findUniqueOrThrow({ where: { id }, include: categoryInclude });
    return toDto(row);
  }

  /** The tree is two levels deep, which is all the storefront shows. */
  private async assertValidParent(parentId: string | null, selfId: string | null): Promise<void> {
    if (parentId === null) return;

    if (parentId === selfId) {
      throw new BadRequestException('Danh mục không thể là danh mục con của chính nó.');
    }

    const parent = await this.prisma.category.findUnique({ where: { id: parentId }, select: { parentId: true } });
    if (!parent) throw new BadRequestException('Danh mục cha không tồn tại.');
    if (parent.parentId !== null) {
      throw new BadRequestException('Chỉ hỗ trợ hai cấp danh mục: danh mục cha không được là danh mục con.');
    }

    if (selfId) {
      const children = await this.prisma.category.count({ where: { parentId: selfId } });
      if (children > 0) {
        throw new BadRequestException('Danh mục đang có danh mục con nên không thể chuyển thành danh mục con.');
      }
    }
  }

  /** Names are compared without case or accents, so "Tôm" and "tom" count as the same name. */
  private async assertNameFree(name: string, parentId: string | null, selfId: string | null): Promise<void> {
    const siblings = await this.prisma.category.findMany({
      where: { parentId, ...(selfId ? { id: { not: selfId } } : {}) },
      select: { name: true },
    });
    const key = slugify(name);
    if (siblings.some((sibling) => slugify(sibling.name) === key)) {
      throw new ConflictException('Đã có danh mục cùng tên ở vị trí này.');
    }
  }

  /** "tom-song", or "tom-song-2", "tom-song-3" when that is taken. */
  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name).slice(0, SLUG_BASE_MAX_LENGTH).replace(/-$/, '') || FALLBACK_SLUG;
    const taken = new Set(
      (await this.prisma.category.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map(
        (row) => row.slug,
      ),
    );

    if (!taken.has(base)) return base;
    for (let suffix = 2; ; suffix++) {
      const candidate = `${base}-${suffix}`;
      if (!taken.has(candidate)) return candidate;
    }
  }
}
