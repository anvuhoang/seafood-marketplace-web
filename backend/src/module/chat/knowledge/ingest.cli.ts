import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module.js';
import { KnowledgeService } from './knowledge.service.js';

/**
 * `npm run knowledge:ingest`: reads backend/knowledge/*.md, embeds what is new or changed and removes what
 * is gone. The API also does this at startup; this is for syncing without restarting it.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const result = await app.get(KnowledgeService).ingest();
    console.log('Knowledge synced:', result);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('Ingest failed:', error);
  process.exit(1);
});
