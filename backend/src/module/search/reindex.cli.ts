import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { ProductIndexerService } from './product-indexer.service.js';

/** `npm run search:reindex`: builds the product index again from the database, without waiting for a change. */
async function main(): Promise<void> {
  process.env.SEARCH_SKIP_BOOTSTRAP = 'true';
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const result = await app.get(ProductIndexerService).reindex();
    console.log(result.ran ? `Product index built: ${JSON.stringify(result)}` : 'Nothing to do: ELASTICSEARCH_URL is not set, or another process is indexing.');
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('Reindex failed:', error);
  process.exit(1);
});
