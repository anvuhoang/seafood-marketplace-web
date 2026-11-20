import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { findWritableVendor } from '../vendor/vendor-access.js';
import { validateAudio } from './audio-validation.js';
import { normalizeDraft, type NormalizedDraft } from './normalize-draft.js';
import { SmartImportLimiter } from './smart-import.limiter.js';
import {
  AiProviderError,
  DRAFT_EXTRACTOR,
  SPEECH_TO_TEXT,
  type DraftExtractor,
  type ExtractionContext,
  type SpeechToText,
} from './smart-import.types.js';

export const SMART_IMPORT_UNAVAILABLE =
  'Tính năng nhập nhanh bằng AI hiện chưa sẵn sàng. Bạn vẫn có thể nhập sản phẩm bằng tay.';
export const SMART_IMPORT_QUOTA =
  'Dịch vụ AI đang quá tải hoặc hết lượt dùng tạm thời. Vui lòng thử lại sau ít phút hoặc nhập tay.';
export const SMART_IMPORT_TIMEOUT =
  'Dịch vụ AI phản hồi quá chậm. Vui lòng thử lại hoặc nhập tay.';
export const SMART_IMPORT_UNREADABLE =
  'Chưa đọc được thông tin sản phẩm từ mô tả này. Hãy nói cụ thể hơn (tên, giá, đơn vị, số lượng) hoặc nhập tay.';
export const SMART_IMPORT_NO_SPEECH =
  'Không nhận ra lời nói trong bản ghi âm. Vui lòng ghi âm lại ở nơi yên tĩnh hơn hoặc gõ mô tả.';

/** An unknown file type or an empty answer is the vendor's to fix; the rest is the service's. */
function toHttpException(error: unknown, unreadable: string): HttpException {
  if (error instanceof HttpException) return error;
  if (!(error instanceof AiProviderError)) {
    return new BadGatewayException(unreadable);
  }
  switch (error.kind) {
    case 'rate_limited':
      return new HttpException(SMART_IMPORT_QUOTA, HttpStatus.TOO_MANY_REQUESTS);
    case 'timeout':
      return new GatewayTimeoutException(SMART_IMPORT_TIMEOUT);
    case 'bad_response':
      return new BadGatewayException(unreadable);
    default:
      return new ServiceUnavailableException(SMART_IMPORT_UNAVAILABLE);
  }
}

/**
 * Turns what a vendor says or types into an editable product draft. It never
 * writes to the database: the vendor reviews the draft and saves it through the
 * normal "create product" call, which stores it as a draft.
 */
@Injectable()
export class SmartImportService {
  private readonly logger = new Logger(SmartImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly limiter: SmartImportLimiter,
    @Inject(SPEECH_TO_TEXT) private readonly speech: SpeechToText,
    @Inject(DRAFT_EXTRACTOR) private readonly extractor: DraftExtractor,
  ) {}

  isEnabled(): boolean {
    const provider = this.config.get<{ provider?: string }>('smartImport')?.provider;
    return provider === 'groq' || provider === 'mock';
  }

  async transcribe(
    userId: string,
    file: { buffer?: Buffer } | undefined,
  ): Promise<string> {
    await findWritableVendor(this.prisma, userId);
    this.assertEnabled();
    const audio = validateAudio(file);
    this.limiter.consume(userId);

    try {
      return await this.speech.transcribe(audio.buffer, audio.filename, audio.mimeType);
    } catch (error) {
      this.logFailure('transcribe', error);
      throw toHttpException(error, SMART_IMPORT_NO_SPEECH);
    }
  }

  async createDraft(userId: string, text: string): Promise<NormalizedDraft> {
    await findWritableVendor(this.prisma, userId);
    this.assertEnabled();
    this.limiter.consume(userId);

    const context = await this.loadContext();
    try {
      const raw = await this.extractor.extract(text, context);
      return normalizeDraft(raw, context);
    } catch (error) {
      this.logFailure('draft', error);
      throw toHttpException(error, SMART_IMPORT_UNREADABLE);
    }
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) throw new ServiceUnavailableException(SMART_IMPORT_UNAVAILABLE);
  }

  /** The categories a draft may use: active, and under an active parent. */
  private async loadContext(): Promise<ExtractionContext> {
    const rows = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, parent: { select: { isActive: true } } },
    });
    return {
      categories: rows
        .filter((row) => row.parent?.isActive ?? true)
        .map(({ id, name }) => ({ id, name })),
    };
  }

  /**
   * Logs the step, the failure kind and the provider's short reason (for example
   * its HTTP status). Those reasons are fixed sentences: they never hold the key,
   * the audio or what the vendor said.
   */
  private logFailure(step: string, error: unknown): void {
    const detail =
      error instanceof AiProviderError
        ? `${error.kind}: ${error.message}`
        : 'unexpected error';
    this.logger.warn(`Smart import ${step} failed (${detail})`);
  }
}
