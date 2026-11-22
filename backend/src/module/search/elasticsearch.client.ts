import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

export const ES_CLIENT = Symbol('ES_CLIENT');

export interface SearchSettings {
  url: string;
  index: string;
  timeoutMs: number;
  maxResults: number;
}

/** Connects to Elasticsearch when ELASTICSEARCH_URL is set; otherwise there is no client and the search stays in memory. */
export function createElasticsearchClient(config: ConfigService): Client | null {
  const settings = config.get<SearchSettings>('search');
  if (!settings?.url) return null;
  new Logger('Elasticsearch').log(`Product search through ${settings.url}`);
  return new Client({
    node: settings.url,
    // A slow search must not make the shop slow: it gives up quickly and the shop searches in memory instead.
    requestTimeout: settings.timeoutMs,
    maxRetries: 1,
    name: 'haisan-api',
  });
}
