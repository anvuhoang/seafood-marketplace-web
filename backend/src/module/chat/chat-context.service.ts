import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoryService } from '../category/category.service.js';
import { ORDER_STATUS_LABEL } from './tools/order-format.js';

/** At most this many notes are kept per customer; the oldest go first. */
export const MAX_MEMORY_NOTES = 10;
export const MAX_NOTE_LENGTH = 200;
const CATEGORY_CACHE_MS = 5 * 60 * 1000;
const FAVOURITES = 5;

/**
 * What the assistant knows about the customer before they type anything: who they are, what they said
 * to remember, what they buy often and their last order. It makes advice personal ("last time you bought
 * tiger prawns") without the customer repeating themselves. Everything here is read from the database.
 */
@Injectable()
export class ChatContextService {
  private categoryCache: { text: string; loadedAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoryService,
  ) {}

  /** "- tom-song: Tôm Sống" lines, so the model can filter a search by a real category slug. */
  async categoryList(): Promise<string> {
    if (this.categoryCache && Date.now() - this.categoryCache.loadedAt < CATEGORY_CACHE_MS) {
      return this.categoryCache.text;
    }
    const categories = await this.categories.listCategories();
    const text = categories.map((category) => `- ${category.slug}: ${category.name}`).join('\n');
    this.categoryCache = { text, loadedAt: Date.now() };
    return text;
  }

  /** A short block about the signed-in customer, or null for a guest. */
  async userBlock(userId: string | null): Promise<string | null> {
    if (!userId) return null;

    const [user, memory, favourites, lastOrder] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, interests: true } }),
      this.prisma.chatMemory.findUnique({ where: { userId }, select: { notes: true } }),
      this.prisma.orderItem.groupBy({
        by: ['productNameSnapshot'],
        where: { vendorOrder: { order: { userId, status: { not: 'CANCELLED' } } } },
        _count: { _all: true },
        orderBy: { _count: { productNameSnapshot: 'desc' } },
        take: FAVOURITES,
      }),
      this.prisma.order.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { orderNumber: true, status: true },
      }),
    ]);
    if (!user) return null;

    const lines = [`Khách đã đăng nhập: ${user.fullName}.`];
    if (user.interests.length > 0) lines.push(`Danh mục khách quan tâm: ${user.interests.join(', ')}.`);
    if (memory && memory.notes.length > 0) {
      lines.push('Khách đã dặn bạn nhớ:', ...memory.notes.map((note) => `- ${note}`));
    }
    if (favourites.length > 0) {
      lines.push(`Món khách hay mua: ${favourites.map((item) => item.productNameSnapshot).join('; ')}.`);
    }
    if (lastOrder) {
      lines.push(`Đơn gần nhất: ${lastOrder.orderNumber} (${ORDER_STATUS_LABEL[lastOrder.status]}).`);
    }
    return lines.join('\n');
  }

  /** Remembers a note for the customer, skipping repeats and dropping the oldest beyond the limit. */
  async addNote(userId: string, rawNote: string): Promise<string[]> {
    const note = rawNote.trim().slice(0, MAX_NOTE_LENGTH);
    const current = (await this.prisma.chatMemory.findUnique({ where: { userId }, select: { notes: true } }))?.notes ?? [];
    if (current.some((item) => item.toLowerCase() === note.toLowerCase())) return current;

    const notes = [...current, note].slice(-MAX_MEMORY_NOTES);
    await this.prisma.chatMemory.upsert({
      where: { userId },
      create: { userId, notes },
      update: { notes },
    });
    return notes;
  }
}
