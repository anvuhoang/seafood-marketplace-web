import { Logger } from '@nestjs/common';
import {
  AiProviderError,
  type SpeechResult,
  type SpeechToText,
} from './smart-import.types.js';

/**
 * Tries our own speech service first and falls back to another provider when it
 * is down or too slow, so a demo or a vendor never hits a dead end.
 *
 * Only "the service did not work" (unavailable, timeout) falls back. When the
 * service answered but heard nothing (bad_response) the other provider would
 * hear nothing either, so that error is returned as it is.
 */
export class FallbackSpeechProvider implements SpeechToText {
  private readonly logger = new Logger(FallbackSpeechProvider.name);

  constructor(
    private readonly primary: SpeechToText,
    private readonly fallback: SpeechToText | null,
  ) {}

  async transcribe(
    audio: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<SpeechResult> {
    try {
      return await this.primary.transcribe(audio, filename, mimeType);
    } catch (error) {
      if (
        !this.fallback ||
        !(error instanceof AiProviderError) ||
        (error.kind !== 'unavailable' && error.kind !== 'timeout')
      ) {
        throw error;
      }

      this.logger.warn(`Speech service failed (${error.kind}: ${error.message}); using the fallback.`);
      return this.fallback.transcribe(audio, filename, mimeType);
    }
  }
}
