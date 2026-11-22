import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AdminSearchController } from './admin-search.controller.js';
import { ES_CLIENT, createElasticsearchClient } from './elasticsearch.client.js';
import { ProductIndexerService } from './product-indexer.service.js';
import { ProductSearchService } from './product-search.service.js';

/** Product search with Elasticsearch. Switched on by ELASTICSEARCH_URL; without it the module does nothing. */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminSearchController],
  providers: [
    { provide: ES_CLIENT, inject: [ConfigService], useFactory: createElasticsearchClient },
    ProductSearchService,
    ProductIndexerService,
  ],
  exports: [ProductSearchService, ProductIndexerService],
})
export class SearchModule {}
