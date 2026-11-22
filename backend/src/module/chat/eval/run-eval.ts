import './eval-env.js';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ChatService, type ChatIdentity } from '../chat.service.js';
import type { ChatEvent } from '../chat.types.js';
import { EVAL_CASES, type EvalCase } from './chat-eval.cases.js';
import { grade, type Outcome } from './eval-grade.js';

interface Result {
  testCase: EvalCase;
  outcome: Outcome;
  failures: string[];
}

const CUSTOMER_EMAIL = 'nam.le@example.com';
const OTHER_CUSTOMER_EMAIL = 'lan.nguyen@example.com';

async function ask(chat: ChatService, identity: ChatIdentity, question: string): Promise<Outcome> {
  const startedAt = Date.now();
  const outcome: Outcome = { tools: [], cardTypes: [], sourceCount: 0, answer: '', error: null, latencyMs: 0 };
  try {
    const run = await chat.start(identity, { message: question });
    for await (const event of run.events() as AsyncIterable<ChatEvent>) {
      if (event.type === 'token') outcome.answer += event.text;
      else if (event.type === 'status' && !outcome.tools.includes(event.tool)) outcome.tools.push(event.tool);
      else if (event.type === 'cards') outcome.cardTypes.push(...event.cards.map((card) => card.type));
      else if (event.type === 'sources') outcome.sourceCount += event.sources.length;
      else if (event.type === 'error') outcome.error = event.message;
    }
  } catch (error) {
    outcome.error = error instanceof Error ? error.message : String(error);
  }
  outcome.latencyMs = Date.now() - startedAt;
  return outcome;
}

const cell = (text: string) => text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();

function report(provider: string, results: Result[]): string {
  const passed = results.filter((result) => result.failures.length === 0).length;
  const latency = Math.round(results.reduce((sum, result) => sum + result.outcome.latencyMs, 0) / results.length);
  const groups = [...new Set(results.map((result) => result.testCase.group))];

  const lines = [
    '# Kết quả đánh giá chatbot',
    '',
    `- Nhà cung cấp mô hình: **${provider}**`,
    `- Ngày chạy: ${new Date().toLocaleString('vi-VN')}`,
    `- Đạt: **${passed}/${results.length}** (${Math.round((passed / results.length) * 100)}%)`,
    `- Thời gian trả lời trung bình: ${(latency / 1000).toFixed(2)} giây`,
    '',
    '## Theo nhóm',
    '',
    '| Nhóm | Đạt |',
    '|---|---|',
    ...groups.map((group) => {
      const inGroup = results.filter((result) => result.testCase.group === group);
      return `| ${group} | ${inGroup.filter((result) => result.failures.length === 0).length}/${inGroup.length} |`;
    }),
    '',
    '## Chi tiết từng câu hỏi',
    '',
    '| # | Người hỏi | Câu hỏi | Công cụ đã gọi | Thẻ | Kết quả | Trả lời (trích) |',
    '|---|---|---|---|---|---|---|',
    ...results.map(({ testCase, outcome, failures }) =>
      `| ${[
        testCase.id,
        testCase.as === 'guest' ? 'Khách' : testCase.as === 'customer' ? 'Khách đã đăng nhập' : 'Khách khác',
        cell(testCase.question),
        outcome.tools.join(', ') || '—',
        [...new Set(outcome.cardTypes)].join(', ') || '—',
        failures.length === 0 ? '✅ Đạt' : `❌ ${cell(failures.join('; '))}`,
        cell(outcome.answer).slice(0, 160),
      ].join(' | ')} |`,
    ),
    '',
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const keep = process.argv.includes('--keep');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const chat = app.get(ChatService);
  const provider = (process.env.CHAT_PROVIDER ?? (process.env.GEMINI_API_KEY ? 'gemini' : 'off')) as string;

  if (!chat.status().enabled) {
    console.error('The assistant is off. Set GEMINI_API_KEY (or CHAT_PROVIDER=mock to check the harness) and try again.');
    await app.close();
    process.exit(1);
  }

  const customers = await prisma.user.findMany({ where: { email: { in: [CUSTOMER_EMAIL, OTHER_CUSTOMER_EMAIL] } }, select: { id: true, email: true } });
  const idOf = (email: string) => customers.find((customer) => customer.email === email)?.id ?? null;
  const customerId = idOf(CUSTOMER_EMAIL);
  const otherId = idOf(OTHER_CUSTOMER_EMAIL);
  if (!customerId || !otherId) {
    console.error(`The cases need the seeded customers ${CUSTOMER_EMAIL} and ${OTHER_CUSTOMER_EMAIL} (npm run seed).`);
    await app.close();
    process.exit(1);
  }

  // The eval talks as real customers, so what it changes is put back at the end.
  const memories = await prisma.chatMemory.findMany({ where: { userId: { in: [customerId, otherId] } } });
  const startedAt = new Date();

  const results: Result[] = [];
  for (const [index, testCase] of EVAL_CASES.entries()) {
    const userId = testCase.as === 'customer' ? customerId : testCase.as === 'other-customer' ? otherId : null;
    const identity: ChatIdentity = { userId, sessionId: `eval-session-${String(index).padStart(4, '0')}-abcdef`, ip: `10.0.0.${index + 1}` };
    const outcome = await ask(chat, identity, testCase.question);
    const failures = grade(testCase, outcome);
    results.push({ testCase, outcome, failures });
    console.log(`${failures.length === 0 ? 'PASS' : 'FAIL'}  ${testCase.id}  ${(outcome.latencyMs / 1000).toFixed(2)}s  ${testCase.question}${failures.length ? `\n      -> ${failures.join('; ')}` : ''}`);
  }

  if (!keep) {
    await prisma.chatConversation.deleteMany({ where: { createdAt: { gte: startedAt }, sessionId: { startsWith: 'eval-session-' } } });
    for (const id of [customerId, otherId]) {
      const before = memories.find((memory) => memory.userId === id);
      if (before) await prisma.chatMemory.update({ where: { userId: id }, data: { notes: before.notes } });
      else await prisma.chatMemory.deleteMany({ where: { userId: id } });
    }
  }

  const file = join(process.cwd(), 'chat-eval-report.md');
  await writeFile(file, report(provider, results), 'utf8');
  const passed = results.filter((result) => result.failures.length === 0).length;
  console.log(`\n${passed}/${results.length} passed. Report: ${file}`);
  await app.close();
  process.exit(passed === results.length ? 0 : 2);
}

main().catch((error: unknown) => {
  console.error('Eval failed:', error);
  process.exit(1);
});
