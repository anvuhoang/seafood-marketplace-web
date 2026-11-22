/** Something shown under an answer, built by the server from what a tool found. Same shapes as the API sends. */
export type ChatCard =
  | {
      type: "product";
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
      type: "order";
      orderNumber: string;
      status: string;
      statusLabel: string;
      paymentLabel: string | null;
      grandTotal: string;
      createdAt: string;
      items: string[];
    }
  | {
      /** "Add to cart" that waits for the customer to press the button. */
      type: "cart_proposal";
      offerId: string;
      productName: string;
      slug: string;
      imageUrl: string | null;
      vendor: string;
      unit: string;
      unitPrice: number;
      quantity: number;
    }
  | { type: "reorder"; orderNumber: string; items: string[] }
  | { type: "handoff"; reason: string }
  | { type: "login_required" };

export interface ChatSource {
  source: string;
  title: string;
}

export type ChatFeedback = "UP" | "DOWN";

export interface ChatMessage {
  /** The server's id once the message is saved; a local id until then. */
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  cards: ChatCard[];
  sources: ChatSource[];
  feedback: ChatFeedback | null;
  /** The answer is still being written. */
  pending?: boolean;
  /** What the assistant is doing right now, e.g. "Đang tìm sản phẩm...". */
  activity?: string | null;
  /** The answer failed; `content` says why. */
  failed?: boolean;
}

export interface ChatConversation {
  conversationId: string | null;
  messages: Array<Omit<ChatMessage, "pending" | "activity" | "failed"> & { createdAt: string }>;
}

/** What the answer stream sends, in order. */
export type ChatStreamEvent =
  | { type: "conversation"; conversationId: string }
  | { type: "status"; tool: string; label: string }
  | { type: "token"; text: string }
  | { type: "cards"; cards: ChatCard[] }
  | { type: "sources"; sources: ChatSource[] }
  | { type: "done"; messageId: string; latencyMs: number }
  | { type: "error"; code: string; message: string };

export interface HandoffInput {
  conversationId: string;
  contactName: string;
  contact: string;
  message: string;
}
