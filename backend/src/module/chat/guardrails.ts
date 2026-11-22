import { foldVietnamese } from './text.js';

export type MessageCheck = { ok: true; text: string } | { ok: false; message: string };

/** Characters that are never part of a chat message (control codes), removed before anything else. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Cleans a visitor's message and refuses one that is empty or too long. */
export function checkUserMessage(raw: unknown, maxLength: number): MessageCheck {
  if (typeof raw !== 'string') return { ok: false, message: 'Tin nhắn không hợp lệ.' };
  const text = raw.replace(CONTROL_CHARS, '').trim();
  if (text === '') return { ok: false, message: 'Bạn chưa nhập nội dung.' };
  if (text.length > maxLength) {
    return { ok: false, message: `Tin nhắn quá dài (tối đa ${maxLength} ký tự). Bạn rút gọn giúp mình nhé.` };
  }
  return { ok: true, text };
}

/**
 * Phrases that try to take over the assistant ("ignore your instructions", "show your system prompt").
 * They are matched on accent-free text. This is only the first fence: the system prompt and the rule that
 * tools, not the model, decide what the customer may see are the ones that really hold.
 */
const INJECTION_PATTERNS = [
  /ignore (all |any |the |your )?(previous|prior|above|earlier) (instructions|prompts?|rules)/,
  /disregard (all |any |the |your )?(previous|prior|above|earlier)/,
  /(reveal|show|print|repeat|leak) (me )?(your |the )?(system|initial|hidden) (prompt|instructions?|message)/,
  /you are now (a |an |in )?(dan|developer mode|jailbroken)/,
  /(bo qua|quen|huy) (tat ca |het |moi |toan bo )?(cac )?(huong dan|chi dan|quy tac|lenh) (truoc|ben tren|o tren|cua ban|ban dau)/,
  /(tiet lo|cho (toi|minh) xem|in ra|nhac lai|doc lai) (system prompt|prompt he thong|huong dan he thong|chi dan he thong)/,
  /(gia vo|dong vai|ban bay gio la) .*(khong (co )?gioi han|khong bi rang buoc|developer mode|che do nha phat trien)/,
];

export function looksLikeInjection(text: string): boolean {
  const folded = foldVietnamese(text);
  return INJECTION_PATTERNS.some((pattern) => pattern.test(folded));
}

export const INJECTION_REPLY =
  'Mình chỉ có thể giúp bạn tìm hải sản, tra đơn hàng và giải đáp chính sách của HaiSan Express thôi nhé. Bạn cần mình hỗ trợ gì ạ?';

/** Phone numbers and emails replaced by stars, so logs never keep a customer's contact details. */
export function maskPii(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '***@***')
    .replace(/(?<!\d)(\+?84|0)[\d .-]{8,12}\d(?!\d)/g, '***phone***');
}

/** A phone number (Vietnamese mobile or landline style) or an email address. */
export function isContact(value: string): boolean {
  const text = value.trim();
  if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(text)) return true;
  return /^(\+?84|0)[\d .-]{8,12}\d$/.test(text);
}
