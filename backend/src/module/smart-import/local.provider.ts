import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProviderError,
  type SpeechResult,
  type SpeechToText,
} from './smart-import.types.js';

export interface LocalSpeechSettings {
  aiServiceUrl: string;
  aiServiceToken: string;
  aiServiceTimeoutMs: number;
}

/**
 * Speech recognition by our own Python service (`ai-service/speech-service`).
 * The service runs a Whisper model we host, for example one fine-tuned on
 * regional speech. Only the recording is sent to it, never a name or account.
 */
@Injectable()
export class LocalSpeechProvider implements SpeechToText {
  constructor(private readonly config: ConfigService) {}

  async transcribe(
    audio: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<SpeechResult> {
    const settings = this.config.get<LocalSpeechSettings>('smartImport');
    if (!settings?.aiServiceUrl) {
      throw new AiProviderError('unavailable', 'AI_SERVICE_URL is not set.');
    }

    const form = new FormData();
    form.append(
      'audio',
      new Blob([new Uint8Array(audio)], { type: mimeType }),
      filename,
    );

    let response: Response;
    try {
      response = await fetch(`${settings.aiServiceUrl.replace(/\/$/, '')}/transcribe`, {
        method: 'POST',
        headers: settings.aiServiceToken
          ? { 'X-AI-Token': settings.aiServiceToken }
          : {},
        body: form,
        signal: AbortSignal.timeout(settings.aiServiceTimeoutMs),
      });
    } catch (error) {
      const timedOut =
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw new AiProviderError(
        timedOut ? 'timeout' : 'unavailable',
        timedOut
          ? 'The speech service did not answer in time.'
          : 'The speech service is unreachable.',
      );
    }

    // The service refusing the recording (400/413/422) is the recording's problem; anything else is the service's.
    if (response.status === 400 || response.status === 413 || response.status === 422) {
      throw new AiProviderError('bad_response', `The speech service refused the recording (${response.status}).`);
    }
    if (!response.ok) {
      throw new AiProviderError(
        'unavailable',
        `The speech service answered with status ${response.status}.`,
      );
    }

    let body: { text?: unknown; engine?: unknown };
    try {
      body = (await response.json()) as { text?: unknown; engine?: unknown };
    } catch {
      throw new AiProviderError('bad_response', 'The speech service answer is not JSON.');
    }
    if (typeof body.text !== 'string' || body.text.trim() === '') {
      throw new AiProviderError('bad_response', 'Empty transcript.');
    }
    const model =
      typeof body.engine === 'string' && body.engine ? body.engine : 'whisper';
    return { text: body.text.trim(), engine: `local:${model}` };
  }
}
