import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { ChatCard, ChatSource } from '../chat.types.js';

export class ChatConversationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  /** DOWN lists only conversations that got a thumbs down. */
  @ApiPropertyOptional({ enum: ['DOWN'] })
  @IsOptional()
  @IsIn(['DOWN'])
  feedback?: 'DOWN';

  /** `true` lists only conversations where the customer left a message for the team. */
  @ApiPropertyOptional({ enum: ['true'] })
  @IsOptional()
  @IsIn(['true'])
  handoff?: 'true';
}

export class ChatHandoffQueryDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'RESOLVED'] })
  @IsOptional()
  @IsIn(['OPEN', 'RESOLVED'])
  status?: 'OPEN' | 'RESOLVED';
}

export class UpdateHandoffDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'RESOLVED'] })
  @IsIn(['OPEN', 'RESOLVED'])
  status: 'OPEN' | 'RESOLVED';
}

export interface ChatStatsDto {
  conversations: number;
  conversationsLast7Days: number;
  userMessages: number;
  answers: number;
  thumbsUp: number;
  thumbsDown: number;
  /** Thumbs up out of all votes, 0-100; null while nobody voted. */
  satisfactionRate: number | null;
  openHandoffs: number;
  totalHandoffs: number;
  averageLatencyMs: number | null;
  toolUsage: Array<{ tool: string; count: number }>;
  /** Conversations opened per day over the last 7 days, oldest first. */
  daily: Array<{ day: string; count: number }>;
  knowledgePassages: number;
}

export interface AdminConversationItemDto {
  id: string;
  customer: { fullName: string; email: string } | null;
  firstMessage: string;
  messageCount: number;
  thumbsDown: number;
  handoffs: number;
  updatedAt: string;
}

export interface AdminConversationListDto {
  items: AdminConversationItemDto[];
  pagination: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface AdminChatMessageDto {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  cards: ChatCard[];
  sources: ChatSource[];
  toolsUsed: string[];
  feedback: 'UP' | 'DOWN' | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface AdminHandoffDto {
  id: string;
  conversationId: string;
  contactName: string;
  contact: string;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  customer: { fullName: string; email: string } | null;
  createdAt: string;
}

export interface AdminConversationDetailDto {
  id: string;
  customer: { fullName: string; email: string } | null;
  createdAt: string;
  messages: AdminChatMessageDto[];
  handoffs: AdminHandoffDto[];
}

export interface LatencyStatsDto {
  count: number;
  averageMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  maxMs: number | null;
}

export interface TokenStatsDto {
  input: number;
  output: number;
  /** Answers whose tokens were counted. */
  answers: number;
  modelCalls: number;
  averagePerAnswer: number | null;
}

export interface IncidentCountDto {
  kind: string;
  count: number;
}

/** How the assistant is doing right now: speed, what it costs, how close it is to its limits, what went wrong. */
export interface ChatHealthDto {
  model: {
    enabled: boolean;
    provider: string;
    chatModel: string;
    embedModel: string;
    timeoutMs: number;
    maxOutputTokens: number;
    maxToolRounds: number;
    historyMessages: number;
    maxMessageLength: number;
  };
  latency: {
    last24h: LatencyStatsDto;
    last7d: LatencyStatsDto;
    daily: Array<{ day: string; count: number; averageMs: number | null; p95Ms: number | null }>;
  };
  tokens: { today: TokenStatsDto; last7d: TokenStatsDto };
  quota: {
    dailyBudget: number;
    usedToday: number;
    remainingToday: number;
    usedPercent: number;
    /** When the daily budget starts again (midnight UTC). */
    resetsAt: string;
    perPerson: { messages: number; windowMinutes: number };
  };
  incidents: {
    last24h: IncidentCountDto[];
    last7d: IncidentCountDto[];
    recent: Array<{ id: string; kind: string; detail: string | null; createdAt: string }>;
  };
  /** Things the team should look at, in Vietnamese. Empty when all is well. */
  warnings: string[];
}
