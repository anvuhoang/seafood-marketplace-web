import { afterEach, describe, expect, it } from 'vitest';
import configuration from './configuration.js';

const KEYS = ['CHAT_PROVIDER', 'GEMINI_API_KEY', 'SMART_IMPORT_PROVIDER', 'GROQ_API_KEY', 'REDIS_URL', 'TRUST_PROXY', 'RATE_LIMIT_ENABLED', 'RATE_LIMIT_TRUST_INTERNAL', 'CACHE_ENABLED'];
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function withEnv(values: Record<string, string | undefined>) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) if (value !== undefined) process.env[key] = value;
  return configuration();
}

describe('configuration', () => {
  it('turns the chatbot on when there is a key, and off when there is not', () => {
    expect(withEnv({}).chat.provider).toBe('off');
    expect(withEnv({ GEMINI_API_KEY: 'k' }).chat.provider).toBe('gemini');
    expect(withEnv({ CHAT_PROVIDER: 'mock' }).chat.provider).toBe('mock');
  });

  it('treats an empty setting as not set (docker compose passes empty values for what .env leaves out)', () => {
    expect(withEnv({ CHAT_PROVIDER: '', GEMINI_API_KEY: 'k' }).chat.provider).toBe('gemini');
    expect(withEnv({ CHAT_PROVIDER: '', GEMINI_API_KEY: '' }).chat.provider).toBe('off');
    expect(withEnv({ SMART_IMPORT_PROVIDER: '', GROQ_API_KEY: 'k' }).smartImport.provider).toBe('groq');
    expect(withEnv({ SMART_IMPORT_PROVIDER: '', GROQ_API_KEY: '' }).smartImport.provider).toBe('off');
  });

  it('has no Redis and no proxy by default, and the limits and the cache on', () => {
    const config = withEnv({});
    expect(config.redis.url).toBe('');
    expect(config.trustProxy).toBe('');
    expect(config.rateLimit).toEqual({ enabled: true, defaultLimit: 300, defaultWindowSeconds: 60, trustInternalHeader: false });
    expect(config.cache).toEqual({ enabled: true, catalogTtlSeconds: 30 });
  });

  it('reads Redis, the proxy and the switches from the environment', () => {
    const config = withEnv({ REDIS_URL: 'redis://redis:6379', TRUST_PROXY: '1', RATE_LIMIT_ENABLED: 'false', CACHE_ENABLED: 'false' });
    expect(config.redis.url).toBe('redis://redis:6379');
    expect(config.trustProxy).toBe('1');
    expect(config.rateLimit.enabled).toBe(false);
    expect(config.cache.enabled).toBe(false);
    expect(withEnv({ RATE_LIMIT_TRUST_INTERNAL: 'true' }).rateLimit.trustInternalHeader).toBe(true);
  });
});
