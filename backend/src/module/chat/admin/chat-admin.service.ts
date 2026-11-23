import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { ChatCard, ChatSource } from '../chat.types.js';
import { KnowledgeService, type IngestResult } from '../knowledge/knowledge.service.js';
import type {
  AdminChatMessageDto,
  AdminConversationDetailDto,
  AdminConversationListDto,
  AdminHandoffDto,
  ChatConversationQueryDto,
  ChatHealthDto,
  ChatStatsDto,
  IncidentCountDto,
  LatencyStatsDto,
  TokenStatsDto,
} from './chat-admin.dto.js';

const FIRST_MESSAGE_LENGTH = 120;
/** An answer is called slow when 1 in 20 takes longer than this. */
const SLOW_P95_MS = 15_000;
const DAYS = 7;

type HandoffRow = Prisma.ChatHandoffGetPayload<{ include: { conversation: { select: { user: { select: { fullName: true; email: true } } } } } }>;

function toHandoff(row: HandoffRow): AdminHandoffDto {
  return {
    id: row.id,
    conversationId: row.conversationId,
    contactName: row.contactName,
    contact: row.contact,
    message: row.message,
    status: row.status,
    customer: row.conversation.user,
    createdAt: row.createdAt.toISOString(),
  };
}

/** What the admin console shows about the chatbot: how it is used, where it fails and who asked for a person. */
@Injectable()
export class ChatAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: KnowledgeService,
    private readonly config: ConfigService,
  ) {}

  async getStats(): Promise<ChatStatsDto> {
    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
    const [conversations, recent, roles, votes, handoffs, latency, tools, daily, passages] = await Promise.all([
      this.prisma.chatConversation.count(),
      this.prisma.chatConversation.count({ where: { createdAt: { gte: since } } }),
      this.prisma.chatMessage.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.chatMessage.groupBy({ by: ['feedback'], where: { feedback: { not: null } }, _count: { _all: true } }),
      this.prisma.chatHandoff.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.chatMessage.aggregate({ _avg: { latencyMs: true }, where: { role: 'ASSISTANT', latencyMs: { gt: 0 } } }),
      this.prisma.$queryRaw<Array<{ tool: string; count: bigint }>>(Prisma.sql`
        SELECT tool, COUNT(*) AS count
        FROM chat_messages, UNNEST(tools_used) AS tool
        GROUP BY tool ORDER BY count DESC`),
      this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(Prisma.sql`
        SELECT (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day, COUNT(*) AS count
        FROM chat_conversations
        WHERE created_at >= ${since}
        GROUP BY day ORDER BY day`),
      this.knowledge.count(),
    ]);

    const count = <T extends { _count: { _all: number } }>(rows: T[], match: (row: T) => boolean) =>
      rows.filter(match).reduce((sum, row) => sum + row._count._all, 0);
    const thumbsUp = count(votes, (row) => row.feedback === 'UP');
    const thumbsDown = count(votes, (row) => row.feedback === 'DOWN');

    return {
      conversations,
      conversationsLast7Days: recent,
      userMessages: count(roles, (row) => row.role === 'USER'),
      answers: count(roles, (row) => row.role === 'ASSISTANT'),
      thumbsUp,
      thumbsDown,
      satisfactionRate: thumbsUp + thumbsDown === 0 ? null : Math.round((thumbsUp / (thumbsUp + thumbsDown)) * 100),
      openHandoffs: count(handoffs, (row) => row.status === 'OPEN'),
      totalHandoffs: count(handoffs, () => true),
      averageLatencyMs: latency._avg.latencyMs === null ? null : Math.round(latency._avg.latencyMs),
      toolUsage: tools.map((row) => ({ tool: row.tool, count: Number(row.count) })),
      daily: daily.map((row) => ({ day: row.day.toISOString().slice(0, 10), count: Number(row.count) })),
      knowledgePassages: passages,
    };
  }

  /** Speed, token use, distance to the limits and incidents, for the "Hiệu năng & hạn mức" part of the admin page. */
  async getHealth(now = new Date()): Promise<ChatHealthDto> {
    const settings = this.config.get<Record<string, number | string | boolean>>('chat') ?? {};
    const hour = new Date(now.getTime() - 60 * 60 * 1000);
    const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const week = new Date(now.getTime() - DAYS * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [latency24h, latency7d, daily, tokensToday, tokens7d, usedToday, incidents24h, incidents7d, recent, lastHour] = await Promise.all([
      this.latency(day),
      this.latency(week),
      this.dailyLatency(week),
      this.tokens(startOfToday),
      this.tokens(week),
      this.prisma.chatMessage.count({ where: { role: 'USER', createdAt: { gte: startOfToday } } }),
      this.incidentCounts(day),
      this.incidentCounts(week),
      this.prisma.chatIncident.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      this.incidentCounts(hour),
    ]);

    const dailyBudget = Number(settings.rateLimitDailyBudget ?? 2000);
    const usedPercent = dailyBudget > 0 ? Math.min(100, Math.round((usedToday / dailyBudget) * 100)) : 0;
    const enabled = Boolean(settings.enabled ?? true) && String(settings.provider ?? 'off') !== 'off';
    const inLastHour = (kind: string) => lastHour.find((row) => row.kind === kind)?.count ?? 0;

    const warnings: string[] = [];
    if (!enabled) warnings.push('Chatbot đang tắt (chưa có GEMINI_API_KEY, hoặc CHAT_PROVIDER=groq với GROQ_API_KEY, hoặc CHATBOT_ENABLED=false).');
    if (usedPercent >= 80) warnings.push(`Đã dùng ${usedPercent}% ngân sách tin nhắn hôm nay (${usedToday}/${dailyBudget}).`);
    if (inLastHour('MODEL_RATE_LIMITED') > 0) {
      warnings.push(`Mô hình báo vượt hạn mức (429) ${inLastHour('MODEL_RATE_LIMITED')} lần trong 1 giờ qua. Hãy kiểm tra quota trên Google AI Studio.`);
    }
    if (inLastHour('MODEL_UNAVAILABLE') + inLastHour('MODEL_TIMEOUT') >= 3) {
      warnings.push('Mô hình lỗi hoặc quá chậm nhiều lần trong 1 giờ qua.');
    }
    if (latency24h.p95Ms !== null && latency24h.p95Ms > SLOW_P95_MS) {
      warnings.push(`Độ trễ p95 trong 24 giờ là ${(latency24h.p95Ms / 1000).toFixed(1)} giây, cao hơn mức ${SLOW_P95_MS / 1000} giây.`);
    }

    return {
      model: {
        enabled,
        provider: String(settings.provider ?? 'off'),
        chatModel: String(settings.chatModel ?? ''),
        embedModel: String(settings.embedModel ?? ''),
        timeoutMs: Number(settings.timeoutMs ?? 0),
        maxOutputTokens: Number(settings.maxOutputTokens ?? 0),
        maxToolRounds: Number(settings.maxToolRounds ?? 0),
        historyMessages: Number(settings.historyMessages ?? 0),
        maxMessageLength: Number(settings.maxMessageLength ?? 0),
      },
      latency: { last24h: latency24h, last7d: latency7d, daily },
      tokens: { today: tokensToday, last7d: tokens7d },
      quota: {
        dailyBudget,
        usedToday,
        remainingToday: Math.max(0, dailyBudget - usedToday),
        usedPercent,
        resetsAt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        perPerson: {
          messages: Number(settings.rateLimitMessages ?? 20),
          windowMinutes: Number(settings.rateLimitWindowMinutes ?? 10),
        },
      },
      incidents: {
        last24h: incidents24h,
        last7d: incidents7d,
        recent: recent.map((row) => ({ id: row.id, kind: row.kind, detail: row.detail, createdAt: row.createdAt.toISOString() })),
      },
      warnings,
    };
  }

  /** Average, median, 95th percentile and slowest answer since a moment. Answers refused without the model (0 ms) are left out. */
  private async latency(since: Date): Promise<LatencyStatsDto> {
    const [row] = await this.prisma.$queryRaw<Array<{ count: bigint; avg: number | null; p50: number | null; p95: number | null; max: number | null }>>(Prisma.sql`
      SELECT COUNT(*) AS count,
             AVG(latency_ms)::float8 AS avg,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50,
             percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95,
             MAX(latency_ms) AS max
      FROM chat_messages
      WHERE role = 'ASSISTANT' AND latency_ms > 0 AND created_at >= ${since}`);
    const round = (value: number | null) => (value === null || value === undefined ? null : Math.round(value));
    return { count: Number(row.count), averageMs: round(row.avg), p50Ms: round(row.p50), p95Ms: round(row.p95), maxMs: round(row.max) };
  }

  private async dailyLatency(since: Date): Promise<ChatHealthDto['latency']['daily']> {
    const rows = await this.prisma.$queryRaw<Array<{ day: Date; count: bigint; avg: number | null; p95: number | null }>>(Prisma.sql`
      SELECT (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
             COUNT(*) AS count,
             AVG(latency_ms)::float8 AS avg,
             percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95
      FROM chat_messages
      WHERE role = 'ASSISTANT' AND latency_ms > 0 AND created_at >= ${since}
      GROUP BY day ORDER BY day`);
    return rows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      count: Number(row.count),
      averageMs: row.avg === null ? null : Math.round(row.avg),
      p95Ms: row.p95 === null ? null : Math.round(row.p95),
    }));
  }

  private async tokens(since: Date): Promise<TokenStatsDto> {
    const total = await this.prisma.chatMessage.aggregate({
      where: { role: 'ASSISTANT', createdAt: { gte: since }, inputTokens: { not: null } },
      _sum: { inputTokens: true, outputTokens: true, modelCalls: true },
      _count: { inputTokens: true },
    });
    const input = total._sum.inputTokens ?? 0;
    const output = total._sum.outputTokens ?? 0;
    const answers = total._count.inputTokens;
    return {
      input,
      output,
      answers,
      modelCalls: total._sum.modelCalls ?? 0,
      averagePerAnswer: answers > 0 ? Math.round((input + output) / answers) : null,
    };
  }

  private async incidentCounts(since: Date): Promise<IncidentCountDto[]> {
    const rows = await this.prisma.chatIncident.groupBy({ by: ['kind'], where: { createdAt: { gte: since } }, _count: { _all: true } });
    return rows.map((row) => ({ kind: row.kind, count: row._count._all })).sort((a, b) => b.count - a.count);
  }

  async listConversations(query: ChatConversationQueryDto): Promise<AdminConversationListDto> {
    const limit = query.limit ?? 20;
    const where: Prisma.ChatConversationWhereInput = {
      ...(query.feedback === 'DOWN' && { messages: { some: { feedback: 'DOWN' } } }),
      ...(query.handoff === 'true' && { handoffs: { some: {} } }),
    };
    const totalItems = await this.prisma.chatConversation.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const page = Math.min(query.page ?? 1, totalPages);

    const rows = await this.prisma.chatConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        updatedAt: true,
        user: { select: { fullName: true, email: true } },
        _count: { select: { messages: true, handoffs: true } },
        messages: { where: { role: 'USER' }, orderBy: { createdAt: 'asc' }, take: 1, select: { content: true } },
      },
    });
    const downs = await this.prisma.chatMessage.groupBy({
      by: ['conversationId'],
      where: { conversationId: { in: rows.map((row) => row.id) }, feedback: 'DOWN' },
      _count: { _all: true },
    });
    const downBy = new Map(downs.map((row) => [row.conversationId, row._count._all]));

    return {
      items: rows.map((row) => ({
        id: row.id,
        customer: row.user,
        firstMessage: (row.messages[0]?.content ?? '').slice(0, FIRST_MESSAGE_LENGTH),
        messageCount: row._count.messages,
        thumbsDown: downBy.get(row.id) ?? 0,
        handoffs: row._count.handoffs,
        updatedAt: row.updatedAt.toISOString(),
      })),
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async getConversation(id: string): Promise<AdminConversationDetailDto> {
    const row = await this.prisma.chatConversation.findUnique({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        user: { select: { fullName: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 500 },
        handoffs: {
          orderBy: { createdAt: 'desc' },
          include: { conversation: { select: { user: { select: { fullName: true, email: true } } } } },
        },
      },
    });
    if (!row) throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');

    return {
      id: row.id,
      customer: row.user,
      createdAt: row.createdAt.toISOString(),
      messages: row.messages.map(
        (message): AdminChatMessageDto => ({
          id: message.id,
          role: message.role,
          content: message.content,
          cards: Array.isArray(message.cards) ? (message.cards as unknown as ChatCard[]) : [],
          sources: Array.isArray(message.sources) ? (message.sources as unknown as ChatSource[]) : [],
          toolsUsed: message.toolsUsed,
          feedback: message.feedback,
          latencyMs: message.latencyMs,
          createdAt: message.createdAt.toISOString(),
        }),
      ),
      handoffs: row.handoffs.map(toHandoff),
    };
  }

  async listHandoffs(status?: 'OPEN' | 'RESOLVED'): Promise<AdminHandoffDto[]> {
    const rows = await this.prisma.chatHandoff.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { conversation: { select: { user: { select: { fullName: true, email: true } } } } },
    });
    return rows.map(toHandoff);
  }

  async updateHandoff(id: string, status: 'OPEN' | 'RESOLVED'): Promise<AdminHandoffDto> {
    const exists = await this.prisma.chatHandoff.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Không tìm thấy lời nhắn.');
    const row = await this.prisma.chatHandoff.update({
      where: { id },
      data: { status },
      include: { conversation: { select: { user: { select: { fullName: true, email: true } } } } },
    });
    return toHandoff(row);
  }

  /** Reads the help documents again and embeds what changed. */
  syncKnowledge(): Promise<IngestResult> {
    return this.knowledge.ingest();
  }
}
