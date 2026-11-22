import { foldVietnamese } from '../text.js';
import type { EvalCase } from './chat-eval.cases.js';

/** What the assistant did when asked one question. */
export interface Outcome {
  tools: string[];
  cardTypes: string[];
  sourceCount: number;
  answer: string;
  error: string | null;
  latencyMs: number;
}

/** Compares what the assistant did with what the case expects, and lists everything that is wrong. */
export function grade({ expect: wanted }: EvalCase, outcome: Outcome): string[] {
  const failures: string[] = [];
  const answer = foldVietnamese(outcome.answer);
  const said = (word: string) => answer.includes(foldVietnamese(word));

  if (outcome.error) failures.push(`lỗi: ${outcome.error}`);
  for (const tool of wanted.tools ?? []) if (!outcome.tools.includes(tool)) failures.push(`không gọi ${tool}`);
  if (wanted.toolsAny && !wanted.toolsAny.some((tool) => outcome.tools.includes(tool))) {
    failures.push(`không gọi một trong ${wanted.toolsAny.join('/')}`);
  }
  for (const tool of wanted.noTools ?? []) if (outcome.tools.includes(tool)) failures.push(`không được gọi ${tool}`);
  for (const card of wanted.cards ?? []) if (!outcome.cardTypes.includes(card)) failures.push(`thiếu thẻ ${card}`);
  for (const card of wanted.noCards ?? []) if (outcome.cardTypes.includes(card)) failures.push(`không được hiện thẻ ${card}`);
  for (const word of wanted.mention ?? []) if (!said(word)) failures.push(`thiếu "${word}"`);
  if (wanted.mentionAny && !wanted.mentionAny.some(said)) failures.push(`thiếu một trong: ${wanted.mentionAny.join(' | ')}`);
  for (const word of wanted.mustNot ?? []) if (said(word)) failures.push(`không được nói "${word}"`);
  if (wanted.sources && outcome.sourceCount === 0) failures.push('không dẫn nguồn');
  return failures;
}
