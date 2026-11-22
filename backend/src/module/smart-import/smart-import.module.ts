import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { GroqProvider } from './providers/groq.provider.js';
import { MockProvider } from './providers/mock.provider.js';
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

@Module({
  imports: [PrismaModule],
  providers: [
    GroqProvider,
    MockProvider,
    SmartImportLimiter,
    SmartImportService,
    {
      provide: SPEECH_TO_TEXT,
      inject: [ConfigService, GroqProvider, MockProvider],
      useFactory: pickProvider,
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
