import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { LLM_PROVIDER, type LlmProvider } from '../llm/llm.types.js';
import { keywords, tokenize } from '../text.js';
import { chunkMarkdown } from './chunker.js';
import { cosine, normalize, reciprocalRankFusion } from './vector.js';

export interface KnowledgePassage {
  source: string;
  title: string;
  content: string;
  /** Closeness to the question, only for comparing passages of the same search. */
  score: number;
}

export interface IngestResult {
  documents: number;
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
}

interface CachedChunk {
  id: string;
  source: string;
  title: string;
  content: string;
  embedding: number[];
  words: Set<string>;
}

/** The search ignores passages with no keyword in common and a vector this far from the question. */
const MIN_SIMILARITY = 0.3;
const CANDIDATES = 8;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * The help documents the assistant can look things up in. Documents are markdown files in `backend/knowledge`:
 * they are cut into passages, embedded once and kept in the database. A search mixes two rankings, vector
 * similarity (finds the meaning) and keywords (finds exact names like "tôm hùm"), with reciprocal rank fusion.
 */
@Injectable()
export class KnowledgeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KnowledgeService.name);
  private cache: { chunks: CachedChunk[]; loadedAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  /** Brings the database up to date with the documents when the API starts, without ever stopping it. */
  async onApplicationBootstrap(): Promise<void> {
    const chat = this.config.get<{ enabled: boolean; provider: string }>('chat');
    if (!chat?.enabled || chat.provider === 'off') return;
    try {
      const result = await this.ingest();
      if (result.added + result.updated + result.removed > 0) {
        this.logger.log(`Knowledge synced: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      this.logger.warn(`Could not sync the knowledge documents: ${String(error)}`);
    }
  }

  private directory(): string {
    return process.env.KNOWLEDGE_DIR ?? join(process.cwd(), 'knowledge');
  }

  /**
   * Which model made the embeddings. It is part of every passage's hash, so changing the provider, the model
   * or the vector size embeds everything again instead of mixing vectors that cannot be compared.
   */
  private embeddingSignature(): string {
    const chat = this.config.get<{ provider?: string; embedModel?: string; embedDimensions?: number }>('chat');
    return `${chat?.provider}:${chat?.embedModel}:${chat?.embedDimensions}`;
  }

  /**
   * Reads every `*.md` file, embeds the passages that are new or changed and removes the ones that are gone.
   * A passage is told apart by its document and position, and kept when its text hash did not change.
   */
  async ingest(): Promise<IngestResult> {
    const directory = this.directory();
    const files = (await readdir(directory).catch(() => [] as string[])).filter((name) => name.endsWith('.md')).sort();

    const signature = this.embeddingSignature();
    const wanted = new Map<string, { source: string; position: number; title: string; content: string; hash: string }>();
    for (const file of files) {
      const source = file.replace(/\.md$/, '');
      const markdown = await readFile(join(directory, file), 'utf8');
      for (const chunk of chunkMarkdown(markdown, source)) {
        wanted.set(`${source}#${chunk.position}`, {
          source,
          ...chunk,
          hash: createHash('sha256').update(signature).update('\n').update(chunk.content).digest('hex'),
        });
      }
    }

    const existing = await this.prisma.knowledgeChunk.findMany({
      select: { id: true, source: true, position: true, contentHash: true, embedding: true },
    });
    const byKey = new Map(existing.map((row) => [`${row.source}#${row.position}`, row]));

    const toEmbed = [...wanted.entries()].filter(([key, chunk]) => {
      const row = byKey.get(key);
      return !row || row.contentHash !== chunk.hash || row.embedding.length === 0;
    });
    const vectors = await this.llm.embed(
      toEmbed.map(([, chunk]) => chunk.content),
      'document',
    );

    let added = 0;
    let updated = 0;
    for (const [index, [key, chunk]] of toEmbed.entries()) {
      const data = {
        title: chunk.title,
        content: chunk.content,
        contentHash: chunk.hash,
        embedding: normalize(vectors[index]),
      };
      await this.prisma.knowledgeChunk.upsert({
        where: { source_position: { source: chunk.source, position: chunk.position } },
        create: { source: chunk.source, position: chunk.position, ...data },
        update: data,
      });
      if (byKey.has(key)) updated++;
      else added++;
    }

    const stale = existing.filter((row) => !wanted.has(`${row.source}#${row.position}`)).map((row) => row.id);
    if (stale.length > 0) await this.prisma.knowledgeChunk.deleteMany({ where: { id: { in: stale } } });

    this.cache = null;
    return {
      documents: files.length,
      added,
      updated,
      removed: stale.length,
      unchanged: wanted.size - toEmbed.length,
    };
  }

  /** The passages closest to the question, best first. Empty when nothing is related. */
  async search(question: string, limit = 4): Promise<KnowledgePassage[]> {
    const chunks = await this.load();
    if (chunks.length === 0) return [];

    const [queryVector] = await this.llm.embed([question], 'query');
    const query = normalize(queryVector);
    const questionWords = keywords(question);

    const scored = chunks.map((chunk) => ({
      chunk,
      similarity: cosine(query, chunk.embedding),
      matches: questionWords.filter((word) => chunk.words.has(word)).length,
    }));

    const byVector = [...scored].sort((a, b) => b.similarity - a.similarity).slice(0, CANDIDATES);
    const byKeyword = scored
      .filter((item) => item.matches > 0)
      .sort((a, b) => b.matches - a.matches || b.similarity - a.similarity)
      .slice(0, CANDIDATES);

    return reciprocalRankFusion([byVector, byKeyword], (item) => item.chunk.id)
      .filter(({ item }) => item.matches > 0 || item.similarity >= MIN_SIMILARITY)
      .slice(0, limit)
      .map(({ item, score }) => ({
        source: item.chunk.source,
        title: item.chunk.title,
        content: item.chunk.content,
        score: Number(score.toFixed(4)),
      }));
  }

  /** How many passages are stored; shown in the admin page. */
  count(): Promise<number> {
    return this.prisma.knowledgeChunk.count();
  }

  private async load(): Promise<CachedChunk[]> {
    if (this.cache && Date.now() - this.cache.loadedAt < CACHE_TTL_MS) return this.cache.chunks;
    const rows = await this.prisma.knowledgeChunk.findMany({
      select: { id: true, source: true, title: true, content: true, embedding: true },
    });
    const chunks = rows
      .filter((row) => row.embedding.length > 0)
      .map((row) => ({ ...row, words: new Set(tokenize(row.content)) }));
    this.cache = { chunks, loadedAt: Date.now() };
    return chunks;
  }
}
