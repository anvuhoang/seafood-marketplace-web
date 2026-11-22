import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Admin } from '../../../common/decorators/admin.decorator.js';
import type { IngestResult } from '../knowledge/knowledge.service.js';
import { ChatAdminService } from './chat-admin.service.js';
import {
  ChatConversationQueryDto,
  ChatHandoffQueryDto,
  UpdateHandoffDto,
  type AdminConversationDetailDto,
  type AdminConversationListDto,
  type AdminHandoffDto,
  type ChatHealthDto,
  type ChatStatsDto,
} from './chat-admin.dto.js';

@ApiTags('Admin - Chatbot')
@Admin()
@ApiResponse({ status: 401, description: 'Missing or invalid token' })
@ApiResponse({ status: 403, description: 'The account is not an ADMIN' })
@Controller('admin/chat')
export class ChatAdminController {
  constructor(private readonly admin: ChatAdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Usage, satisfaction, tools used and open messages for the team' })
  stats(): Promise<ChatStatsDto> {
    return this.admin.getStats();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Speed, token use, distance to the limits and incidents of the assistant',
    description: "Latency (average, p50, p95), tokens, today's message budget against its limit, model errors and refusals, and warnings.",
  })
  health(): Promise<ChatHealthDto> {
    return this.admin.getHealth();
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Conversations, newest first; filter the ones with a thumbs down or a message for the team' })
  conversations(@Query() query: ChatConversationQueryDto): Promise<AdminConversationListDto> {
    return this.admin.listConversations(query);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'One conversation with every message, the tools used and its hand-offs' })
  @ApiResponse({ status: 404, description: 'No such conversation' })
  conversation(@Param('id', ParseUUIDPipe) id: string): Promise<AdminConversationDetailDto> {
    return this.admin.getConversation(id);
  }

  @Get('handoffs')
  @ApiOperation({ summary: 'Messages customers left for the support team' })
  handoffs(@Query() query: ChatHandoffQueryDto): Promise<AdminHandoffDto[]> {
    return this.admin.listHandoffs(query.status);
  }

  @Patch('handoffs/:id')
  @ApiOperation({ summary: 'Mark a message as resolved, or open it again' })
  @ApiResponse({ status: 404, description: 'No such message' })
  updateHandoff(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHandoffDto): Promise<AdminHandoffDto> {
    return this.admin.updateHandoff(id, dto.status);
  }

  @Post('knowledge/sync')
  @HttpCode(200)
  @ApiOperation({ summary: 'Read the help documents again and embed the ones that changed' })
  syncKnowledge(): Promise<IngestResult> {
    return this.admin.syncKnowledge();
  }
}
