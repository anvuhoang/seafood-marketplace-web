import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChatContextService } from './chat-context.service.js';
import { ChatLimiter, ChatLimitError } from './chat.limiter.js';
import {
  CHAT_BUSY_MESSAGE,
  type ChatCard,
  type ChatEvent,
  type ChatSource,
  type ChatTool,
  type ToolContext,
  type ToolOutcome,
} from './chat.types.js';
import type { ChatConversationDto, ChatMessageDto, FeedbackDto, HandoffDto } from './dto/chat.dto.js';
import { INJECTION_REPLY, checkUserMessage, isContact, looksLikeInjection, maskPii } from './guardrails.js';
import {
  LLM_PROVIDER,
  LlmError,
  type LlmMessage,
  type LlmProvider,
  type LlmToolCall,
  type LlmToolResult,
} from './llm/llm.types.js';
import { buildSystemPrompt, toLlmHistory } from './system-prompt.js';
import { ToolArgError } from './tools/tool-args.js';
import { ChatToolRegistry } from './tools/tool-registry.js';

export const CHAT_DISABLED = 'Trợ lý hiện đang tắt. Bạn vui lòng liên hệ hotline để được hỗ trợ.';
export const CONVERSATION_NOT_FOUND = 'Không tìm thấy cuộc trò chuyện.';
export const MESSAGE_NOT_FOUND = 'Không tìm thấy tin nhắn.';
const EMPTY_ANSWER = 'Mình chưa có câu trả lời phù hợp. Bạn thử hỏi lại theo cách khác, hoặc để lại lời nhắn để nhân viên hỗ trợ nhé.';
const BLOCKED_ANSWER = 'Mình không thể hỗ trợ nội dung này. Bạn hỏi mình về hải sản, đơn hàng hoặc chính sách của sàn nhé.';
const TOOL_FAILED = { error: 'Công cụ gặp lỗi. Hãy xin lỗi khách và đề nghị thử lại sau.' };
/** The model may ask for this many tools at once; the rest are refused. */
const MAX_CALLS_PER_ROUND = 4;

/** Who is asking. `userId` comes from the verified token, `sessionId` from the browser. */
export interface ChatIdentity {
  userId: string | null;
  sessionId: string;
  ip: string;
}

/** A message that passed every check and is saved; its answer is produced while `events` is read. */
export interface ChatRun {
  conversationId: string;
  events(signal?: AbortSignal): AsyncGenerator<ChatEvent>;
}

interface ChatSettings {
  enabled: boolean;
  provider: string;
  maxMessageLength: number;
  maxOutputTokens: number;
  historyMessages: number;
  maxToolRounds: number;
}

/**
 * The shopping assistant. One message is one run of this loop: ask the model, run the tools it asks for,
 * give it the results, and repeat until it answers (at most a few rounds). The model never touches the
 * database: tools do, and they are told who the customer is by the token, not by the model.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly limiter: ChatLimiter,
    private readonly context: ChatContextService,
    private readonly tools: ChatToolRegistry,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  private settings(): ChatSettings {
    const chat = this.config.get<Partial<ChatSettings>>('chat') ?? {};
    return {
      enabled: chat.enabled ?? true,
      provider: chat.provider ?? 'off',
      maxMessageLength: chat.maxMessageLength ?? 500,
      maxOutputTokens: chat.maxOutputTokens ?? 1500,
      historyMessages: chat.historyMessages ?? 12,
      maxToolRounds: chat.maxToolRounds ?? 4,
    };
  }

  /** Whether the assistant is switched on and has a model behind it. */
  status(): { enabled: boolean } {
    const { enabled, provider } = this.settings();
    return { enabled: enabled && provider !== 'off' };
  }

  /**
   * Checks the message, counts it against the limits, finds or opens the conversation and saves the message.
   * Everything that can be refused is refused here, before the answer starts streaming, so it is a normal
   * HTTP error (400, 404, 429, 503) and not an event inside a stream.
   */
  async start(identity: ChatIdentity, input: { message: string; conversationId?: string }): Promise<ChatRun> {
    if (!this.status().enabled) throw new ServiceUnavailableException(CHAT_DISABLED);
    const settings = this.settings();

    const checked = checkUserMessage(input.message, settings.maxMessageLength);
    if (!checked.ok) throw new BadRequestException(checked.message);
    this.consumeLimit(identity);

    const conversationId = input.conversationId
      ? await this.openConversation(identity, input.conversationId)
      : await this.createConversation(identity);

    await this.prisma.chatMessage.create({
      data: { conversationId, role: 'USER', content: checked.text },
    });

    const refuse = looksLikeInjection(checked.text);
    return {
      conversationId,
      events: (signal) => (refuse ? this.refuse(conversationId) : this.answer(identity, conversationId, signal)),
    };
  }

  /** A fixed reply to an attempt to take over the assistant; the model is not asked. */
  private async *refuse(conversationId: string): AsyncGenerator<ChatEvent> {
    void this.record('INJECTION', undefined, conversationId);
    yield { type: 'token', text: INJECTION_REPLY };
    const saved = await this.saveAnswer(conversationId, { content: INJECTION_REPLY, cards: [], sources: [], toolsUsed: [], latencyMs: 0, inputTokens: 0, outputTokens: 0, modelCalls: 0 });
    yield { type: 'done', messageId: saved.id, latencyMs: 0 };
  }

  private async *answer(
    identity: ChatIdentity,
    conversationId: string,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatEvent> {
    const settings = this.settings();
    const startedAt = Date.now();
    const cards: ChatCard[] = [];
    const sources: ChatSource[] = [];
    const toolsUsed: string[] = [];
    let answer = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let modelCalls = 0;

    try {
      const [rows, categories, customer] = await Promise.all([
        this.prisma.chatMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          take: settings.historyMessages,
          select: { role: true, content: true, cards: true },
        }),
        this.context.categoryList(),
        this.context.userBlock(identity.userId),
      ]);
      // The model must be spoken to first, so a history that was cut in the middle starts at a customer message.
      const history = toLlmHistory(rows.reverse());
      while (history.length > 0 && history[0].role !== 'user') history.shift();

      const system = buildSystemPrompt({ categories, customer, now: new Date() });
      const messages: LlmMessage[] = history;
      const toolContext: ToolContext = { userId: identity.userId, conversationId };

      for (let round = 0; round <= settings.maxToolRounds; round++) {
        if (signal?.aborted) return;
        let text = '';
        const calls: LlmToolCall[] = [];

        // In the last round no tool is offered, so the model has to answer with what it has.
        const offered = round < settings.maxToolRounds ? this.tools.declarations() : [];
        modelCalls++;
        for await (const chunk of this.llm.generate({
          system,
          messages,
          tools: offered,
          maxOutputTokens: settings.maxOutputTokens,
          signal,
        })) {
          if (chunk.type === 'text') {
            if (text === '' && answer !== '') {
              answer += '\n\n';
              yield { type: 'token', text: '\n\n' };
            }
            text += chunk.text;
            answer += chunk.text;
            yield { type: 'token', text: chunk.text };
          } else if (chunk.type === 'tool_call') {
            calls.push(chunk.call);
          } else {
            inputTokens += chunk.inputTokens;
            outputTokens += chunk.outputTokens;
          }
        }

        if (calls.length === 0) break;

        messages.push({ role: 'assistant', text, toolCalls: calls });
        const results: LlmToolResult[] = [];
        const runs = calls.map((call, index) => ({ call, tool: index < MAX_CALLS_PER_ROUND ? this.tools.get(call.name) : undefined }));
        for (const { call, tool } of runs) {
          if (tool) yield { type: 'status', tool: call.name, label: tool.statusLabel };
        }
        const outcomes = await Promise.all(runs.map(({ call, tool }) => this.runTool(call, tool, toolContext)));

        outcomes.forEach((outcome, index) => {
          const { call } = runs[index];
          results.push({ id: call.id, name: call.name, result: outcome.data });
          if (!toolsUsed.includes(call.name)) toolsUsed.push(call.name);
          cards.push(...(outcome.cards ?? []));
          for (const source of outcome.sources ?? []) {
            if (!sources.some((item) => item.title === source.title)) sources.push(source);
          }
        });
        const newCards = outcomes.flatMap((outcome) => outcome.cards ?? []);
        if (newCards.length > 0) yield { type: 'cards', cards: newCards };
        messages.push({ role: 'tool', results });
      }
    } catch (error) {
      if (signal?.aborted) return;
      yield this.failure(error, conversationId);
      return;
    }

    if (sources.length > 0) yield { type: 'sources', sources };

    if (answer.trim() === '') {
      answer = EMPTY_ANSWER;
      yield { type: 'token', text: EMPTY_ANSWER };
    }
    const latencyMs = Date.now() - startedAt;
    const saved = await this.saveAnswer(conversationId, { content: answer, cards, sources, toolsUsed, latencyMs, inputTokens, outputTokens, modelCalls });
    this.logger.log(`answered in ${latencyMs}ms, ${inputTokens}+${outputTokens} tokens, tools: ${toolsUsed.join(',') || 'none'}`);
    yield { type: 'done', messageId: saved.id, latencyMs };
  }

  /** Runs one tool, and turns every way it can fail into a result the model can read and apologise for. */
  private async runTool(call: LlmToolCall, tool: ChatTool | undefined, context: ToolContext): Promise<ToolOutcome> {
    if (!tool) return { data: { error: `Không có công cụ "${call.name}".` } };
    try {
      return await tool.execute(call.args, context);
    } catch (error) {
      if (error instanceof ToolArgError) return { data: { error: error.message } };
      this.logger.error(`Tool ${call.name} failed: ${maskPii(String(error))}`);
      void this.record('TOOL_FAILED', `${call.name}: ${String(error)}`, context.conversationId);
      return { data: TOOL_FAILED };
    }
  }

  /** Counts one message against the limits; the limit that refuses it is noted for the admin page. */
  private consumeLimit(identity: ChatIdentity): void {
    try {
      this.limiter.consume(identity.userId ?? `ip:${identity.ip}`);
    } catch (error) {
      if (error instanceof ChatLimitError) void this.record(error.kind);
      throw error;
    }
  }

  /** Notes an incident for the admin page. It must never break an answer, so a failure to write it is only logged. */
  private async record(kind: string, detail?: string, conversationId?: string): Promise<void> {
    try {
      await this.prisma.chatIncident.create({
        data: { kind, detail: detail ? maskPii(detail).slice(0, 300) : undefined, conversationId },
      });
    } catch (error) {
      this.logger.warn(`Could not record the incident ${kind}: ${String(error)}`);
    }
  }

  /** What a failed answer looks like to the visitor; the real reason only goes to the log. */
  private failure(error: unknown, conversationId: string): ChatEvent {
    if (error instanceof LlmError) {
      this.logger.warn(`Model error (${error.code}): ${maskPii(error.message)}`);
      void this.record(`MODEL_${error.code.toUpperCase()}`, error.message, conversationId);
      if (error.code === 'blocked') return { type: 'error', code: 'failed', message: BLOCKED_ANSWER };
      return { type: 'error', code: 'busy', message: CHAT_BUSY_MESSAGE };
    }
    this.logger.error(`Chat failed: ${maskPii(String(error))}`);
    void this.record('INTERNAL_ERROR', String(error), conversationId);
    return { type: 'error', code: 'failed', message: CHAT_BUSY_MESSAGE };
  }

  private saveAnswer(
    conversationId: string,
    data: {
      content: string;
      cards: ChatCard[];
      sources: ChatSource[];
      toolsUsed: string[];
      latencyMs: number;
      inputTokens: number;
      outputTokens: number;
      modelCalls: number;
    },
  ) {
    return this.prisma
      .$transaction([
        this.prisma.chatMessage.create({
          data: {
            conversationId,
            role: 'ASSISTANT',
            content: data.content,
            cards: data.cards.length > 0 ? (data.cards as unknown as Prisma.InputJsonValue) : undefined,
            sources: data.sources.length > 0 ? (data.sources as unknown as Prisma.InputJsonValue) : undefined,
            toolsUsed: data.toolsUsed,
            latencyMs: data.latencyMs,
            inputTokens: data.inputTokens,
            outputTokens: data.outputTokens,
            modelCalls: data.modelCalls,
          },
        }),
        this.prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
      ])
      .then(([message]) => message);
  }

  // ----- conversations -------------------------------------------------------------------------------------

  /** A conversation belongs to the signed-in customer, or to the browser session that opened it as a guest. */
  private ownedBy(identity: ChatIdentity): Prisma.ChatConversationWhereInput {
    const guest = { userId: null, sessionId: identity.sessionId };
    return identity.userId ? { OR: [{ userId: identity.userId }, guest] } : guest;
  }

  private createConversation(identity: ChatIdentity): Promise<string> {
    return this.prisma.chatConversation
      .create({ data: { userId: identity.userId, sessionId: identity.sessionId }, select: { id: true } })
      .then((row) => row.id);
  }

  /** The id of an existing conversation of this visitor. A guest chat is adopted by the customer who signs in. */
  private async openConversation(identity: ChatIdentity, id: string): Promise<string> {
    const row = await this.prisma.chatConversation.findFirst({
      where: { id, ...this.ownedBy(identity) },
      select: { id: true, userId: true },
    });
    if (!row) throw new NotFoundException(CONVERSATION_NOT_FOUND);
    if (identity.userId && !row.userId) {
      await this.prisma.chatConversation.update({ where: { id }, data: { userId: identity.userId } });
    }
    return row.id;
  }

  /** The saved messages of a conversation, oldest first. */
  async getConversation(identity: ChatIdentity, id: string): Promise<ChatConversationDto> {
    const row = await this.prisma.chatConversation.findFirst({
      where: { id, ...this.ownedBy(identity) },
      select: { id: true },
    });
    if (!row) throw new NotFoundException(CONVERSATION_NOT_FOUND);
    return this.readConversation(row.id);
  }

  /** The visitor's most recent conversation, to bring the chat back after a page reload. */
  async getLatestConversation(identity: ChatIdentity): Promise<ChatConversationDto> {
    const row = await this.prisma.chatConversation.findFirst({
      where: this.ownedBy(identity),
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return row ? this.readConversation(row.id) : { conversationId: null, messages: [] };
  }

  private async readConversation(id: string): Promise<ChatConversationDto> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return {
      conversationId: id,
      messages: rows.map(
        (row): ChatMessageDto => ({
          id: row.id,
          role: row.role,
          content: row.content,
          cards: Array.isArray(row.cards) ? (row.cards as unknown as ChatCard[]) : [],
          sources: Array.isArray(row.sources) ? (row.sources as unknown as ChatSource[]) : [],
          feedback: row.feedback,
          createdAt: row.createdAt.toISOString(),
        }),
      ),
    };
  }

  // ----- feedback and hand-off -----------------------------------------------------------------------------

  /** A thumbs up or down on one of the assistant's answers (NONE takes it back). */
  async setFeedback(identity: ChatIdentity, messageId: string, dto: FeedbackDto): Promise<void> {
    const row = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, role: 'ASSISTANT', conversation: this.ownedBy(identity) },
      select: { id: true },
    });
    if (!row) throw new NotFoundException(MESSAGE_NOT_FOUND);
    await this.prisma.chatMessage.update({
      where: { id: row.id },
      data: { feedback: dto.feedback === 'NONE' ? null : dto.feedback },
    });
  }

  /** Saves a message for the support team, from the form the assistant showed. */
  async createHandoff(identity: ChatIdentity, dto: HandoffDto): Promise<{ id: string }> {
    if (!isContact(dto.contact)) {
      throw new BadRequestException('Vui lòng nhập số điện thoại hoặc email hợp lệ.');
    }
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: dto.conversationId, ...this.ownedBy(identity) },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException(CONVERSATION_NOT_FOUND);
    this.consumeLimit(identity);

    const handoff = await this.prisma.chatHandoff.create({
      data: {
        conversationId: conversation.id,
        contactName: dto.contactName,
        contact: dto.contact,
        message: dto.message,
      },
      select: { id: true },
    });
    return handoff;
  }
}
