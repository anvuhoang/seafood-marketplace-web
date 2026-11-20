import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { FallbackSpeechProvider } from './fallback-speech.provider.js';
import { GroqProvider } from './groq.provider.js';
import { LocalSpeechProvider } from './local.provider.js';
import { MockProvider } from './mock.provider.js';
import { SmartImportLimiter } from './smart-import.limiter.js';
import { SmartImportService } from './smart-import.service.js';
import {
  AiProviderError,
  DRAFT_EXTRACTOR,
  SPEECH_TO_TEXT,
  type DraftExtractor,
  type SpeechToText,
} from './smart-import.types.js';

/** Used while no provider is configured; the service answers 503 before it is ever called. */
const disabledProvider: SpeechToText & DraftExtractor = {
  transcribe: () => Promise.reject(new AiProviderError('unavailable', 'No AI provider is configured.')),
  extract: () => Promise.reject(new AiProviderError('unavailable', 'No AI provider is configured.')),
};

/** One setting (SMART_IMPORT_PROVIDER) decides who answers, for speech and for drafts alike. */
function pickProvider(config: ConfigService, groq: GroqProvider, mock: MockProvider) {
  const provider = config.get<{ provider?: string }>('smartImport')?.provider;
  if (provider === 'groq') return groq;
  if (provider === 'mock') return mock;
  return disabledProvider;
}

/**
 * Speech follows SMART_IMPORT_PROVIDER, unless SMART_IMPORT_SPEECH_PROVIDER=local
 * asks for our own Python service. That one falls back to Groq (or the mock) when it is
 * down, but only if that provider is actually set up.
 */
function pickSpeech(
  config: ConfigService,
  groq: GroqProvider,
  mock: MockProvider,
  local: LocalSpeechProvider,
): SpeechToText {
  const settings = config.get<{
    provider?: string;
    speechProvider?: string;
    groqApiKey?: string;
  }>('smartImport');
  if (settings?.speechProvider === 'local') {
    const fallback = settings.groqApiKey
      ? groq
      : settings.provider === 'mock'
        ? mock
        : null;
    return new FallbackSpeechProvider(local, fallback);
  }
  return pickProvider(config, groq, mock);
}

@Module({
  imports: [PrismaModule],
  providers: [
    GroqProvider,
    MockProvider,
    LocalSpeechProvider,
    SmartImportLimiter,
    SmartImportService,
    {
      provide: SPEECH_TO_TEXT,
      inject: [ConfigService, GroqProvider, MockProvider, LocalSpeechProvider],
      useFactory: pickSpeech,
    },
    {
      provide: DRAFT_EXTRACTOR,
      inject: [ConfigService, GroqProvider, MockProvider],
      useFactory: pickProvider,
    },
  ],
  exports: [SmartImportService],
})
export class SmartImportModule {}
