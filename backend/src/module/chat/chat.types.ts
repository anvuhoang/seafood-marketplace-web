import type { LlmToolDeclaration } from './llm/llm.types.js';

/** Something the chat shows under an answer, built from what a tool found (never written by the model). */
export type ChatCard =
  | {
      type: 'product';
      offerId: string;
      name: string;
      slug: string;
      imageUrl: string | null;
      price: number;
      unit: string;
      vendor: string;
      inStock: boolean;
      stock: number;
    }
  | {
      type: 'order';
      orderNumber: string;
      status: string;
      statusLabel: string;
      paymentLabel: string | null;
      grandTotal: string;
      createdAt: string;
      items: string[];
    }
  | {
      /** "Add to cart" waiting for the customer's confirmation; nothing is added until they press the button. */
      type: 'cart_proposal';
      offerId: string;
      productName: string;
      slug: string;
      imageUrl: string | null;
      vendor: string;
      unit: string;
      unitPrice: number;
      quantity: number;
    }
  | {
      /** "Buy this order again", also waiting for the customer's confirmation. */
      type: 'reorder';
      orderNumber: string;
      items: string[];
    }
  | { type: 'handoff'; reason: string }
  | { type: 'login_required' };

export interface ChatSource {
  source: string;
  title: string;
}

/** Who is talking, as far as the tools are concerned. `userId` comes from the token, never from the model. */
export interface ToolContext {
  userId: string | null;
  conversationId: string;
}

/** What a tool gives back: `data` goes to the model, `cards` and `sources` go to the screen. */
export interface ToolOutcome {
  data: unknown;
  cards?: ChatCard[];
  sources?: ChatSource[];
}

export interface ChatTool {
  declaration: LlmToolDeclaration;
  /** Short text shown while the tool runs, e.g. "Đang tìm sản phẩm...". */
  statusLabel: string;
  execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome>;
}

/** What the stream of one answer sends to the browser, in order. */
export type ChatEvent =
  | { type: 'conversation'; conversationId: string }
  | { type: 'status'; tool: string; label: string }
  | { type: 'token'; text: string }
  | { type: 'cards'; cards: ChatCard[] }
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'done'; messageId: string; latencyMs: number }
  | { type: 'error'; code: ChatErrorCode; message: string };

export type ChatErrorCode =
  | 'disabled'
  | 'rate_limited'
  | 'busy'
  | 'invalid'
  | 'not_found'
  | 'failed';

/** Said to a visitor when the model fails; the real reason goes to the logs. */
export const CHAT_BUSY_MESSAGE =
  'Trợ lý đang bận một chút. Bạn thử lại sau ít phút, hoặc để lại lời nhắn để nhân viên hỗ trợ nhé.';
