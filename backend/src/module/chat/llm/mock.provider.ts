import { Injectable } from '@nestjs/common';
import { extractOrderNumber, foldVietnamese, truncate } from '../text.js';
import { localEmbeddings } from './local-embedding.js';
import type {
  LlmChunk,
  LlmMessage,
  LlmProvider,
  LlmRequest,
  LlmTask,
  LlmToolCall,
  LlmToolResult,
} from './llm.types.js';

/** Words that make the mock look for products. */
const PRODUCT_WORDS = [
  'tom', 'cua', 'ghe', 'muc', 'ca ', 'so ', 'oc ', 'hau', 'hai san', 'lau', 'nuong', 'bach tuoc', 'tuoi song',
  'gia', 'mua', 'con hang', 'ngan sach', 'goi y', 'tu van',
];
/** Words that make the mock look in the help documents. */
const KNOWLEDGE_WORDS = [
  'chinh sach', 'doi tra', 'hoan tien', 'ship', 'giao hang', 'van chuyen', 'phi ', 'thanh toan', 'bao quan',
  'che bien', 'huy don', 'lam sao', 'the nao', 'bao lau', 'ap dung', 'cod', 'qr',
];

/**
 * A stand-in for the language model that needs no key and no network: it picks tools by keywords and writes
 * the answer from what the tools returned. It is for development and tests, never for real customers.
 */
@Injectable()
export class MockLlmProvider implements LlmProvider {
  async *generate(request: LlmRequest): AsyncGenerator<LlmChunk> {
    const last = request.messages[request.messages.length - 1];
    const read = estimateTokens(request.system) + request.messages.reduce((sum, message) => sum + estimateTokens(JSON.stringify(message)), 0);

    if (last?.role === 'tool') {
      const answer = composeAnswer(last.results);
      for (const piece of pieces(answer)) yield { type: 'text', text: piece };
      yield { type: 'usage', inputTokens: read, outputTokens: estimateTokens(answer) };
      return;
    }

    const text = last?.role === 'user' ? last.text : '';
    const calls = chooseTools(text, request, request.messages);
    if (calls.length > 0) {
      for (const call of calls) yield { type: 'tool_call', call };
      yield { type: 'usage', inputTokens: read, outputTokens: estimateTokens(JSON.stringify(calls)) };
      return;
    }
    const greeting =
      'Mình là trợ lý của HaiSan Express, có thể giúp bạn tìm hải sản, tra đơn hàng và giải đáp chính sách của sàn. Bạn muốn hỏi gì ạ?';
    for (const piece of pieces(greeting)) yield { type: 'text', text: piece };
    yield { type: 'usage', inputTokens: read, outputTokens: estimateTokens(greeting) };
  }

  /** Hashes words and word pairs into a fixed-size vector: similar wording gives similar vectors. */
  async embed(texts: string[], _task: LlmTask): Promise<number[][]> {
    return localEmbeddings(texts);
  }
}

/** About one token per four characters: close enough for a stand-in that has no real tokenizer. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Splits an answer into small pieces, so the mock streams like a real model. */
function pieces(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}

function has(request: LlmRequest, name: string): boolean {
  return request.tools.some((tool) => tool.name === name);
}

function call(index: number, name: string, args: Record<string, unknown>): LlmToolCall {
  return { id: `mock_${index}`, name, args };
}

function chooseTools(text: string, request: LlmRequest, history: LlmMessage[]): LlmToolCall[] {
  const folded = ` ${foldVietnamese(text)} `;
  const hasAny = (words: string[]) => words.some((word) => folded.includes(word));

  if (hasAny(['nhan vien', 'tong dai', 'khieu nai', 'gap nguoi that']) && has(request, 'contact_support')) {
    return [call(1, 'contact_support', { reason: text })];
  }

  if (hasAny(['di ung', 'toi thich', 'minh thich', 'toi khong an', 'nha toi co']) && has(request, 'remember_preference')) {
    return [call(1, 'remember_preference', { note: text })];
  }

  const orderNumber = extractOrderNumber(text);
  if (orderNumber && has(request, 'get_my_order')) {
    return [call(1, 'get_my_order', { orderNumber })];
  }
  if (hasAny([' don hang', ' don cua', 'tra don', 'don toi', 'don minh']) && has(request, 'list_my_recent_orders')) {
    return [call(1, 'list_my_recent_orders', {})];
  }

  if (hasAny(['vao gio', 'mua cai dau', 'lay cai dau']) && has(request, 'propose_add_to_cart')) {
    const offerId = lastOfferId(history);
    if (offerId) return [call(1, 'propose_add_to_cart', { offerId, quantity: 1 })];
  }

  // A question about a policy or a how-to goes to the documents, unless it names a product only.
  if (hasAny(KNOWLEDGE_WORDS) && has(request, 'search_knowledge')) {
    return [call(1, 'search_knowledge', { question: text })];
  }
  if (hasAny(PRODUCT_WORDS) && has(request, 'search_products')) {
    return [call(1, 'search_products', { query: productQuery(folded) })];
  }
  return [];
}

/** The first product word of the message, as the search keyword. */
function productQuery(folded: string): string {
  for (const word of ['tom hum', 'tom su', 'tom', 'cua', 'ghe', 'muc', 'bach tuoc', 'hau', 'oc', 'so', 'ca']) {
    if (folded.includes(` ${word} `) || folded.includes(` ${word}`)) return word;
  }
  return '';
}

/** The offerId of the product card the assistant showed last, found in the history notes. */
function lastOfferId(history: LlmMessage[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    if (message.role !== 'assistant') continue;
    const match = message.text.match(/offerId=([0-9a-f-]{36})/i);
    if (match) return match[1];
  }
  return null;
}

function money(value: unknown): string {
  return typeof value === 'number' ? `${value.toLocaleString('vi-VN')}đ` : String(value ?? '');
}

/** An answer written from the tool results, in plain Vietnamese. */
function composeAnswer(results: LlmToolResult[]): string {
  const parts: string[] = [];
  for (const { name, result } of results) {
    const data = (result ?? {}) as Record<string, unknown>;
    if (typeof data.error === 'string') {
      parts.push(data.error);
      continue;
    }
    if (name === 'search_products') {
      const products = (data.products as Array<Record<string, unknown>> | undefined) ?? [];
      if (products.length === 0) {
        parts.push('Hiện mình chưa tìm thấy sản phẩm phù hợp. Bạn thử mô tả khác giúp mình nhé.');
      } else {
        parts.push(
          `Mình tìm được ${products.length} sản phẩm phù hợp: ` +
            products.map((item) => `${item.name} (${money(item.price)}/${item.unit})`).join('; ') +
            '.',
        );
      }
    } else if (name === 'get_my_order') {
      const order = data.order as Record<string, unknown> | undefined;
      parts.push(
        order
          ? `Đơn ${order.orderNumber} đang ở trạng thái "${order.statusLabel}", tổng ${money(order.grandTotal)}.`
          : 'Mình không tìm thấy đơn hàng này.',
      );
    } else if (name === 'list_my_recent_orders') {
      const orders = (data.orders as Array<Record<string, unknown>> | undefined) ?? [];
      parts.push(
        orders.length === 0
          ? 'Bạn chưa có đơn hàng nào.'
          : `Các đơn gần đây của bạn: ${orders.map((item) => `${item.orderNumber} (${item.statusLabel})`).join(', ')}.`,
      );
    } else if (name === 'search_knowledge') {
      const passages = (data.passages as Array<Record<string, unknown>> | undefined) ?? [];
      parts.push(
        passages.length === 0
          ? 'Mình chưa có thông tin về việc này. Bạn có thể để lại lời nhắn để nhân viên hỗ trợ nhé.'
          : `${truncate(String(passages[0].content), 400)} (Nguồn: ${passages[0].title})`,
      );
    } else if (name === 'propose_add_to_cart') {
      parts.push(`Mình đã chuẩn bị thêm ${data.quantity} ${data.unit} ${data.productName} vào giỏ, bạn bấm xác nhận bên dưới nhé.`);
    } else if (name === 'remember_preference') {
      parts.push('Mình đã ghi nhớ điều này cho những lần tư vấn sau.');
    } else if (name === 'contact_support') {
      parts.push('Bạn để lại thông tin liên hệ ở biểu mẫu bên dưới, nhân viên sẽ liên hệ lại sớm nhất.');
    }
  }
  return parts.join('\n') || 'Mình chưa có thông tin để trả lời, bạn thử hỏi cách khác nhé.';
}
