import { normalize } from '../knowledge/vector.js';
import { tokenize } from '../text.js';

/** Vector size of the local embedding. */
export const LOCAL_EMBED_SIZE = 512;

/** A small stable hash of a word (FNV-1a), so the same word always lands in the same slot. */
export function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619) >>> 0;
  }
  return value;
}

/**
 * A text turned into a vector without any model or network: each word, and each pair of neighbouring words, adds to
 * a slot chosen by its hash ("the hashing trick"). Two texts that share words get vectors that point the same way,
 * so cosine similarity measures overlap of words and phrases.
 *
 * It does not understand meaning the way a real embedding model does ("hoàn tiền" and "trả lại tiền" are unrelated
 * to it), but the help search also ranks by keywords, and it is enough to find the right document when the question
 * uses the document's own words. It is what the chatbot uses with a provider that has no embedding model (Groq), and
 * what the mock uses.
 */
export function localEmbeddings(texts: string[], size = LOCAL_EMBED_SIZE): number[][] {
  return texts.map((text) => {
    const vector = Array.from({ length: size }, () => 0);
    const words = tokenize(text);
    for (let i = 0; i < words.length; i++) {
      vector[hash(words[i]) % size] += 1;
      if (i + 1 < words.length) vector[hash(`${words[i]} ${words[i + 1]}`) % size] += 0.5;
    }
    return normalize(vector);
  });
}
