import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';
import { ChatService, type ChatIdentity } from './chat.service.js';
import type { ChatEvent } from './chat.types.js';
import { ChatConversationDto, FeedbackDto, HandoffDto, SendMessageDto } from './dto/chat.dto.js';
import { OptionalAuthGuard } from './optional-auth.guard.js';

const SESSION_HEADER = 'x-chat-session';
const SESSION_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/** Who is asking: the token's user when there is a valid one, plus the browser's chat session. */
function identify(request: AuthenticatedRequest): ChatIdentity {
  const userId = request.user?.sub ?? null;
  const header = request.headers[SESSION_HEADER];
  const sessionId = typeof header === 'string' && SESSION_PATTERN.test(header) ? header : null;
  if (!sessionId && !userId) throw new BadRequestException('Thiếu mã phiên trò chuyện.');
  return {
    userId,
    sessionId: sessionId ?? `user-${userId}`,
    ip: request.ip ?? request.socket.remoteAddress ?? 'unknown',
  };
}

/**
 * The shopping assistant. Open to guests (they are told apart by the X-Chat-Session header) and to signed-in
 * customers (by their token), so the routes are @Public() and the guard only reads the token when there is one.
 */
@ApiTags('Chat')
@Public()
@UseGuards(OptionalAuthGuard)
@ApiHeader({ name: 'X-Chat-Session', required: false, description: 'A random id (16-64 characters) the browser keeps; needed for guests.' })
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('status')
  @ApiOperation({ summary: 'Whether the assistant is switched on' })
  status(): { enabled: boolean } {
    return this.chat.status();
  }

  @Post('messages')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Send a message and stream the answer',
    description:
      'Answers as server-sent events: `conversation`, then `status`, `token`, `cards` and `sources` while the answer is produced, and `done` or `error` at the end.',
  })
  @ApiResponse({ status: 200, description: 'text/event-stream' })
  @ApiResponse({ status: 400, description: 'Empty or too long message' })
  @ApiResponse({ status: 404, description: 'The conversation is not this visitor\'s' })
  @ApiResponse({ status: 429, description: 'Too many messages' })
  @ApiResponse({ status: 503, description: 'The assistant is switched off' })
  async send(@Body() dto: SendMessageDto, @Req() request: AuthenticatedRequest, @Res() response: Response): Promise<void> {
    const run = await this.chat.start(identify(request), dto);

    response.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Tells a reverse proxy not to hold the stream back until it is complete.
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();

    // When the visitor closes the chat the model call is cancelled, so nothing is spent on an answer nobody reads.
    const abort = new AbortController();
    response.on('close', () => {
      if (!response.writableFinished) abort.abort();
    });

    const write = (event: ChatEvent) => response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    try {
      write({ type: 'conversation', conversationId: run.conversationId });
      for await (const event of run.events(abort.signal)) write(event);
    } finally {
      response.end();
    }
  }

  @Get('conversations/latest')
  @ApiOperation({ summary: 'The visitor\'s most recent conversation, to restore the chat' })
  @ApiResponse({ status: 200, type: ChatConversationDto })
  latest(@Req() request: AuthenticatedRequest): Promise<ChatConversationDto> {
    return this.chat.getLatestConversation(identify(request));
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'The messages of one of the visitor\'s conversations' })
  @ApiResponse({ status: 200, type: ChatConversationDto })
  @ApiResponse({ status: 404, description: 'Not this visitor\'s conversation' })
  conversation(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest): Promise<ChatConversationDto> {
    return this.chat.getConversation(identify(request), id);
  }

  @Post('messages/:id/feedback')
  @HttpCode(204)
  @ApiOperation({ summary: 'Thumbs up or down on an answer' })
  @ApiResponse({ status: 204, description: 'Saved' })
  @ApiResponse({ status: 404, description: 'Not an answer of this visitor\'s conversation' })
  async feedback(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FeedbackDto, @Req() request: AuthenticatedRequest): Promise<void> {
    await this.chat.setFeedback(identify(request), id, dto);
  }

  @Post('handoff')
  @HttpCode(201)
  @ApiOperation({ summary: 'Leave a message for the support team' })
  @ApiResponse({ status: 201, description: 'Saved' })
  handoff(@Body() dto: HandoffDto, @Req() request: AuthenticatedRequest): Promise<{ id: string }> {
    return this.chat.createHandoff(identify(request), dto);
  }
}
