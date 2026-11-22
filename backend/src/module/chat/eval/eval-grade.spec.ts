import { describe, expect, it } from 'vitest';
import { EVAL_CASES, type EvalCase } from './chat-eval.cases.js';
import { grade, type Outcome } from './eval-grade.js';

const outcome = (overrides: Partial<Outcome> = {}): Outcome => ({
  tools: [],
  cardTypes: [],
  sourceCount: 0,
  answer: '',
  error: null,
  latencyMs: 10,
  ...overrides,
});

const caseOf = (expectation: EvalCase['expect']): EvalCase => ({ id: 'T', group: 'g', as: 'guest', question: '?', expect: expectation });

describe('grade', () => {
  it('passes when everything expected happened', () => {
    const testCase = caseOf({ tools: ['search_knowledge'], cards: ['product'], mention: ['30.000'], sources: true });
    expect(grade(testCase, outcome({ tools: ['search_knowledge'], cardTypes: ['product'], sourceCount: 1, answer: 'Phí là 30.000đ/vựa' }))).toEqual([]);
  });

  it('lists each thing that is missing or forbidden', () => {
    const testCase = caseOf({ tools: ['a'], noTools: ['b'], cards: ['product'], noCards: ['order'], mention: ['x'], mustNot: ['y'], sources: true });
    const failures = grade(testCase, outcome({ tools: ['b'], cardTypes: ['order'], answer: 'có y' }));
    expect(failures).toEqual([
      'không gọi a',
      'không được gọi b',
      'thiếu thẻ product',
      'không được hiện thẻ order',
      'thiếu "x"',
      'không được nói "y"',
      'không dẫn nguồn',
    ]);
  });

  it('compares words without accents or case, and accepts any of a list', () => {
    expect(grade(caseOf({ mention: ['1 đổi 1'], mentionAny: ['KHĂN ẨM', 'nơi mát'] }), outcome({ answer: 'Được ĐỔI 1 ĐỔI 1, phủ khăn ẩm' }))).toEqual([]);
    expect(grade(caseOf({ mentionAny: ['a', 'b'], toolsAny: ['t1', 't2'] }), outcome({ answer: 'c' }))).toEqual(['không gọi một trong t1/t2', 'thiếu một trong: a | b']);
  });

  it('counts an error as a failure', () => {
    expect(grade(caseOf({}), outcome({ error: 'bận' }))).toEqual(['lỗi: bận']);
  });
});

describe('the eval cases', () => {
  it('have unique ids, and cover every kind of asker and the main tools', () => {
    const ids = EVAL_CASES.map((testCase) => testCase.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(EVAL_CASES.map((testCase) => testCase.as))).toEqual(new Set(['guest', 'customer', 'other-customer']));
    const tools = new Set(EVAL_CASES.flatMap((testCase) => [...(testCase.expect.tools ?? []), ...(testCase.expect.toolsAny ?? [])]));
    for (const tool of ['search_products', 'get_my_order', 'list_my_recent_orders', 'search_knowledge', 'propose_add_to_cart', 'propose_reorder', 'remember_preference', 'contact_support']) {
      expect(tools.has(tool), tool).toBe(true);
    }
  });
});
