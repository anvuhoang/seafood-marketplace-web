import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ProductModule } from '../product/product.module.js';
import { GroqVisionProvider } from './groq-vision.provider.js';
import { VisualSearchController } from './visual-search.controller.js';
import { VisualSearchLimiter } from './visual-search.limiter.js';
import { VisualSearchService } from './visual-search.service.js';
import { AiProviderError, SEAFOOD_RECOGNIZER, type SeafoodRecognizer } from './visual-search.types.js';

/** Used while the feature is off; the service answers 503 before it is ever called. */
const disabledRecognizer: SeafoodRecognizer = {
  recognize: () =>
    Promise.reject(new AiProviderError('unavailable', 'No AI provider is configured.')),
};

@Module({
  // AuthModule provides JwtService, used to read an optional token for the limit.
  imports: [PrismaModule, AuthModule, ProductModule],
  controllers: [VisualSearchController],
  providers: [
    GroqVisionProvider,
    VisualSearchLimiter,
    VisualSearchService,
    {
      provide: SEAFOOD_RECOGNIZER,
      inject: [ConfigService, GroqVisionProvider],
      useFactory: (config: ConfigService, groq: GroqVisionProvider) =>
        config.get<{ provider?: string }>('visualSearch')?.provider === 'groq'
          ? groq
          : disabledRecognizer,
    },
  ],
})
export class VisualSearchModule {}
