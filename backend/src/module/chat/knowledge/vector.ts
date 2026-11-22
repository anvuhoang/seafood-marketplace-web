/** Scales a vector to length 1, so a dot product between two of them is their cosine similarity. */
export function normalize(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const length = Math.sqrt(sum);
  return length === 0 ? vector.slice() : vector.map((value) => value / length);
}

/** Cosine similarity of two vectors of the same size, from -1 to 1. 0 when either is empty. */
export function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

/**
 * Merges ranked lists into one with reciprocal rank fusion: an item scores 1 / (k + rank) in each list it
 * appears in, and the scores add up. It needs no common scale between lists, so vector similarity and
 * keyword scores can be mixed.
 */
export function reciprocalRankFusion<T>(
  lists: T[][],
  key: (item: T) => string,
  k = 60,
): Array<{ item: T; score: number }> {
  const scores = new Map<string, { item: T; score: number }>();
  for (const list of lists) {
    list.forEach((item, index) => {
      const id = key(item);
      const entry = scores.get(id) ?? { item, score: 0 };
      entry.score += 1 / (k + index + 1);
      scores.set(id, entry);
    });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score);
}
