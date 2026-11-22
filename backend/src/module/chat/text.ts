/** Lowercase text without accents, so "Ghẹ xanh" and "ghe xanh" compare equal. */
export function foldVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

/** Accent-free words of a text, punctuation dropped. */
export function tokenize(text: string): string[] {
  return foldVietnamese(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Words too common to tell passages apart; left out of keyword matching. */
const STOP_WORDS = new Set([
  'la', 'va', 'co', 'cua', 'cho', 'toi', 'minh', 'ban', 'em', 'anh', 'chi', 'nay', 'kia', 'do', 'the', 'nao',
  'nhu', 'khong', 'duoc', 'bi', 'se', 'da', 'dang', 'rat', 'hay', 'thi', 'ma', 'o', 'tai', 'trong', 'voi',
  'mot', 'nhung', 'cac', 'gi', 'sao', 'ra', 'vao', 'len', 'xuong', 'de', 'nen', 'cung', 'nua', 'ah', 'a',
]);

/** Words of a text that carry meaning: tokenized, with the filler words removed. */
export function keywords(text: string): string[] {
  return tokenize(text).filter((word) => !STOP_WORDS.has(word));
}

/** Order numbers look like "HSE-12345678" (the seed data has shorter ones like "HSE-90002"). */
const ORDER_NUMBER = /\bHSE-\d{4,10}\b/i;

export function extractOrderNumber(text: string): string | null {
  return text.match(ORDER_NUMBER)?.[0].toUpperCase() ?? null;
}

/** A sentence shortened to `max` characters on a word boundary. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6))}…`;
}
