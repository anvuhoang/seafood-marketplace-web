import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real package cannot be loaded in this test pool; the service only needs its name here.
vi.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import type { ConfigService } from '@nestjs/config';
import { LlmError, type LlmProvider } from '../llm/llm.types.js';
import { MockLlmProvider } from '../llm/mock.provider.js';
import { KnowledgeService } from './knowledge.service.js';

interface Row {
  id: string;
  source: string;
  title: string;
  content: string;
  position: number;
  contentHash: string;
  embedding: number[];
}

/** The few Prisma calls of the service, over an array. */
function fakePrisma() {
  const rows: Row[] = [];
  let seq = 0;
  return {
    rows,
    knowledgeChunk: {
      findMany: vi.fn(async () => rows.map((row) => ({ ...row }))),
      upsert: vi.fn(async ({ where, create, update }: { where: { source_position: { source: string; position: number } }; create: Omit<Row, 'id'>; update: Partial<Row> }) => {
        const existing = rows.find((row) => row.source === where.source_position.source && row.position === where.source_position.position);
        if (existing) Object.assign(existing, update);
        else rows.push({ id: `chunk-${++seq}`, ...create });
      }),
      deleteMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
        for (const id of where.id.in) rows.splice(rows.findIndex((row) => row.id === id), 1);
      }),
      count: vi.fn(async () => rows.length),
    },
  };
}

const DOCS = {
  'giao-hang.md': '# Giao hàng\n\n## Phí vận chuyển\nPhí vận chuyển là 30.000đ cho mỗi vựa trong đơn hàng.\n\n## Thời gian\nGiao trong 2 giờ tại TP.HCM.\n',
  'bao-quan.md': '# Bảo quản\n\n## Ghẹ sống\nĐể ghẹ sống ở nơi mát, phủ khăn ẩm, không ngâm nước ngọt.\n',
};

let directory: string;
let embed: ReturnType<typeof vi.fn>;

async function writeDocs(docs: Record<string, string>) {
  for (const [name, text] of Object.entries(docs)) await writeFile(join(directory, name), text, 'utf8');
}

function build(provider = 'mock', llm?: LlmProvider) {
  const prisma = fakePrisma();
  const mock = new MockLlmProvider();
  embed = vi.fn((texts: string[], task: 'document' | 'query') => mock.embed(texts, task));
  const provided = llm ?? ({ generate: mock.generate.bind(mock), embed } as unknown as LlmProvider);
  const config = { get: () => ({ enabled: true, provider }) } as unknown as ConfigService;
  return { prisma, service: new KnowledgeService(prisma as never, config, provided) };
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'knowledge-'));
  process.env.KNOWLEDGE_DIR = directory;
});

afterEach(async () => {
  delete process.env.KNOWLEDGE_DIR;
  await rm(directory, { recursive: true, force: true });
});

describe('KnowledgeService.ingest', () => {
  it('stores every passage once, and leaves unchanged ones alone the next time', async () => {
    await writeDocs(DOCS);
    const { service, prisma } = build();

    expect(await service.ingest()).toEqual({ documents: 2, added: 3, updated: 0, removed: 0, unchanged: 0 });
    expect(prisma.rows).toHaveLength(3);
    expect(prisma.rows.find((row) => row.source === 'giao-hang' && row.position === 0)).toMatchObject({ title: 'Giao hàng — Phí vận chuyển' });
    expect(prisma.rows.every((row) => row.embedding.length > 0)).toBe(true);

    embed.mockClear();
    expect(await service.ingest()).toEqual({ documents: 2, added: 0, updated: 0, removed: 0, unchanged: 3 });
    expect(embed).toHaveBeenCalledWith([], 'document');
  });

  it('embeds only the passage that changed, and removes passages that are gone', async () => {
    await writeDocs(DOCS);
    const { service, prisma } = build();
    await service.ingest();

    await writeFile(join(directory, 'giao-hang.md'), DOCS['giao-hang.md'].replace('30.000đ', '25.000đ'), 'utf8');
    await rm(join(directory, 'bao-quan.md'));
    const result = await service.ingest();

    expect(result).toEqual({ documents: 1, added: 0, updated: 1, removed: 1, unchanged: 1 });
    expect(prisma.rows.map((row) => row.source)).toEqual(['giao-hang', 'giao-hang']);
    expect(prisma.rows[0].content).toContain('25.000đ');
  });

  it('embeds everything again when another model made the stored vectors', async () => {
    await writeDocs(DOCS);
    const first = build('mock');
    await first.service.ingest();

    // Same database, another provider: vectors of a different size cannot be compared with the old ones.
    const other = new KnowledgeService(first.prisma as never, { get: () => ({ enabled: true, provider: 'gemini', embedModel: 'gemini-embedding-001', embedDimensions: 768 }) } as unknown as ConfigService, new MockLlmProvider());
    expect(await other.ingest()).toEqual({ documents: 2, added: 0, updated: 3, removed: 0, unchanged: 0 });
  });

  it('ignores files that are not markdown, and a missing folder', async () => {
    await writeFile(join(directory, 'ghi-chu.txt'), 'không phải tài liệu', 'utf8');
    const { service } = build();
    expect((await service.ingest()).documents).toBe(0);

    await rm(directory, { recursive: true });
    expect(await service.ingest()).toMatchObject({ documents: 0, added: 0 });
    await mkdir(directory);
  });
});

describe('KnowledgeService.search', () => {
  async function loaded() {
    await writeDocs(DOCS);
    const built = build();
    await built.service.ingest();
    return built.service;
  }

  it('finds the passage that answers the question, best first', async () => {
    const service = await loaded();
    const [best] = await service.search('Phí vận chuyển bao nhiêu?');
    expect(best).toMatchObject({ source: 'giao-hang', title: 'Giao hàng — Phí vận chuyển' });
    expect(best.content).toContain('30.000đ');

    const [care] = await service.search('cách giữ ghẹ sống');
    expect(care.source).toBe('bao-quan');
  });

  it('finds nothing for a question the documents do not cover', async () => {
    const service = await loaded();
    expect(await service.search('hôm nay trời mưa không')).toEqual([]);
  });

  it('returns nothing, and does not ask the model, when there are no documents', async () => {
    const { service } = build();
    expect(await service.search('phí vận chuyển')).toEqual([]);
    expect(embed).not.toHaveBeenCalled();
  });

  it('respects the limit', async () => {
    const service = await loaded();
    expect((await service.search('giao hàng vận chuyển bảo quản ghẹ', 1)).length).toBeLessThanOrEqual(1);
  });
});

describe('KnowledgeService at start-up', () => {
  it('syncs the documents when the assistant is on', async () => {
    await writeDocs(DOCS);
    const { service, prisma } = build('mock');
    await service.onApplicationBootstrap();
    expect(prisma.rows).toHaveLength(3);
  });

  it('does nothing while the assistant is off', async () => {
    await writeDocs(DOCS);
    const { service, prisma } = build('off');
    await service.onApplicationBootstrap();
    expect(prisma.rows).toHaveLength(0);
  });

  it('never stops the API from starting when the model is down', async () => {
    await writeDocs(DOCS);
    const failing: LlmProvider = {
      generate: async function* () {},
      embed: () => Promise.reject(new LlmError('unavailable', 'down')),
    };
    const { service } = build('gemini', failing);
    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
  });
});
