import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CartModule } from '../cart/cart.module.js';
import { CategoryModule } from '../category/category.module.js';
import { OrderModule } from '../order/order.module.js';
import { ProductModule } from '../product/product.module.js';
import { ChatAdminController } from './admin/chat-admin.controller.js';
import { ChatAdminService } from './admin/chat-admin.service.js';
import { ChatContextService } from './chat-context.service.js';
import { ChatController } from './chat.controller.js';
import { ChatLimiter } from './chat.limiter.js';
import { ChatService } from './chat.service.js';
import { KnowledgeService } from './knowledge/knowledge.service.js';
import { GeminiProvider } from './llm/gemini.provider.js';
import { LLM_PROVIDER, LlmError, type LlmProvider } from './llm/llm.types.js';
import { MockLlmProvider } from './llm/mock.provider.js';
import { OptionalAuthGuard } from './optional-auth.guard.js';
import { ContactSupportTool, RememberPreferenceTool } from './tools/account.tools.js';
import { ProposeAddToCartTool } from './tools/cart-proposal.tool.js';
import { GetMyOrderTool, ListMyRecentOrdersTool, ProposeReorderTool } from './tools/order.tools.js';
import { SearchKnowledgeTool } from './tools/search-knowledge.tool.js';
import { SearchProductsTool } from './tools/search-products.tool.js';
import { ChatToolRegistry } from './tools/tool-registry.js';

/** Used while the assistant is off; the service answers 503 before it is ever called. */
const disabledProvider: LlmProvider = {
  // eslint-disable-next-line require-yield
  async *generate() {
    throw new LlmError('unavailable', 'No chat provider is configured.');
  },
  embed: () => Promise.reject(new LlmError('unavailable', 'No chat provider is configured.')),
};

/** One setting (CHAT_PROVIDER) decides who answers; the rest of the module only knows the LlmProvider type. */
function pickProvider(config: ConfigService, gemini: GeminiProvider, mock: MockLlmProvider): LlmProvider {
  const provider = config.get<{ provider?: string }>('chat')?.provider;
  if (provider === 'gemini') return gemini;
  if (provider === 'mock') return mock;
  return disabledProvider;
}

@Module({
  imports: [PrismaModule, AuthModule, CartModule, CategoryModule, OrderModule, ProductModule],
  controllers: [ChatController, ChatAdminController],
  providers: [
    ChatService,
    ChatAdminService,
    ChatLimiter,
    ChatContextService,
    KnowledgeService,
    OptionalAuthGuard,
    ChatToolRegistry,
    SearchProductsTool,
    SearchKnowledgeTool,
    GetMyOrderTool,
    ListMyRecentOrdersTool,
    ProposeReorderTool,
    ProposeAddToCartTool,
    RememberPreferenceTool,
    ContactSupportTool,
    GeminiProvider,
    MockLlmProvider,
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService, GeminiProvider, MockLlmProvider],
      useFactory: pickProvider,
    },
  ],
  exports: [ChatService, KnowledgeService],
})
export class ChatModule {}
