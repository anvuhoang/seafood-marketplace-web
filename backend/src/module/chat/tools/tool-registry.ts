import { Injectable } from '@nestjs/common';
import type { ChatTool } from '../chat.types.js';
import type { LlmToolDeclaration } from '../llm/llm.types.js';
import { ContactSupportTool, RememberPreferenceTool } from './account.tools.js';
import { ProposeAddToCartTool } from './cart-proposal.tool.js';
import { GetMyOrderTool, ListMyRecentOrdersTool, ProposeReorderTool } from './order.tools.js';
import { SearchKnowledgeTool } from './search-knowledge.tool.js';
import { SearchProductsTool } from './search-products.tool.js';

/** Every tool the assistant may call, by name. Adding a tool means adding a class and listing it here. */
@Injectable()
export class ChatToolRegistry {
  private readonly tools: Map<string, ChatTool>;

  constructor(
    searchProducts: SearchProductsTool,
    getMyOrder: GetMyOrderTool,
    listMyRecentOrders: ListMyRecentOrdersTool,
    searchKnowledge: SearchKnowledgeTool,
    proposeAddToCart: ProposeAddToCartTool,
    proposeReorder: ProposeReorderTool,
    rememberPreference: RememberPreferenceTool,
    contactSupport: ContactSupportTool,
  ) {
    const all: ChatTool[] = [
      searchProducts,
      getMyOrder,
      listMyRecentOrders,
      searchKnowledge,
      proposeAddToCart,
      proposeReorder,
      rememberPreference,
      contactSupport,
    ];
    this.tools = new Map(all.map((tool) => [tool.declaration.name, tool]));
  }

  declarations(): LlmToolDeclaration[] {
    return [...this.tools.values()].map((tool) => tool.declaration);
  }

  get(name: string): ChatTool | undefined {
    return this.tools.get(name);
  }
}
