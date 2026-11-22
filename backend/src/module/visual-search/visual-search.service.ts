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
import {
  PRODUCT_SEARCH_MAX_LENGTH,
  type ProductListingDto,
} from '../product/dto/product-listing.dto.js';
import { ProductListingService } from '../product/product-listing.service.js';
import type {
  VisualSearchMatchedBy,
  VisualSearchOutcome,
  VisualSearchResultDto,
} from './dto/visual-search.dto.js';
import { validateImage } from './image-validation.js';
import { normalizePrediction, type NormalizedPrediction } from './normalize-prediction.js';
import { VisualSearchLimiter, type VisualSearchClient } from './visual-search.limiter.js';
import {
  AiProviderError,
  SEAFOOD_RECOGNIZER,
  type RecognitionContext,
  type SeafoodRecognizer,
} from './visual-search.types.js';

/** How many products a search returns; the rest are one click away on /products. */
export const VISUAL_SEARCH_PRODUCT_LIMIT = 8;

export const VISUAL_SEARCH_DISCLAIMER =
  'Kết quả nhận diện do AI gợi ý từ hình ảnh và có thể chưa chính xác. Vui lòng xem kỹ thông tin sản phẩm trước khi đặt mua.';
export const VISUAL_SEARCH_UNAVAILABLE =
  'Tính năng tìm bằng hình ảnh hiện chưa sẵn sàng. Bạn vẫn có thể tìm bằng từ khóa.';
export const VISUAL_SEARCH_QUOTA =
  'Dịch vụ nhận diện ảnh đang quá tải hoặc hết lượt dùng tạm thời. Vui lòng thử lại sau ít phút hoặc tìm bằng từ khóa.';
export const VISUAL_SEARCH_TIMEOUT =
  'Dịch vụ nhận diện ảnh phản hồi quá chậm. Vui lòng thử lại hoặc tìm bằng từ khóa.';
export const VISUAL_SEARCH_UNREADABLE =
  'Chưa đọc được kết quả nhận diện cho ảnh này. Vui lòng thử ảnh khác hoặc tìm bằng từ khóa.';

/** Each provider failure becomes one clear Vietnamese message that points to keyword search. */
function toHttpException(error: unknown): HttpException {
  if (error instanceof HttpException) return error;
  if (!(error instanceof AiProviderError)) {
    return new BadGatewayException(VISUAL_SEARCH_UNREADABLE);
  }
  switch (error.kind) {
    case 'rate_limited':
      return new HttpException(VISUAL_SEARCH_QUOTA, HttpStatus.TOO_MANY_REQUESTS);
    case 'timeout':
      return new GatewayTimeoutException(VISUAL_SEARCH_TIMEOUT);
    case 'bad_response':
      return new BadGatewayException(VISUAL_SEARCH_UNREADABLE);
    default:
      return new ServiceUnavailableException(VISUAL_SEARCH_UNAVAILABLE);
  }
}

/**
 * Finds products from a photo: the model names a species or category from our
 * own lists, and the products come from the normal catalogue listing, so every
 * result is a real product that is for sale. Nothing is stored.
 */
@Injectable()
export class VisualSearchService {
  private readonly logger = new Logger(VisualSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly limiter: VisualSearchLimiter,
    private readonly listing: ProductListingService,
    @Inject(SEAFOOD_RECOGNIZER) private readonly recognizer: SeafoodRecognizer,
  ) {}

  isEnabled(): boolean {
    return this.config.get<{ provider?: string }>('visualSearch')?.provider === 'groq';
  }

  async search(
    file: { buffer?: Buffer } | undefined,
    client: VisualSearchClient,
  ): Promise<VisualSearchResultDto> {
    if (!this.isEnabled()) throw new ServiceUnavailableException(VISUAL_SEARCH_UNAVAILABLE);
    // A wrong file costs no attempt: check it before counting the call.
    const image = validateImage(file);
    this.limiter.consume(await this.limiter.keyFor(client));

    const context = await this.loadContext();
    let prediction: NormalizedPrediction;
    try {
      const raw = await this.recognizer.recognize(
        { buffer: image.buffer, mimeType: image.mimeType },
        context,
      );
      prediction = normalizePrediction(raw, context);
    } catch (error) {
      this.logFailure(error);
      throw toHttpException(error);
    }

    return this.buildResult(prediction);
  }

  private async buildResult(prediction: NormalizedPrediction): Promise<VisualSearchResultDto> {
    const empty = {
      matchedBy: null,
      products: [],
      totalProducts: 0,
      disclaimer: VISUAL_SEARCH_DISCLAIMER,
      imageQuality: prediction.imageQuality,
    };

    if (!prediction.isSeafood) {
      return { ...empty, outcome: 'not_seafood', prediction: null, alternatives: [], searchQuery: null };
    }

    const searchQuery = prediction.label
      ? prediction.label.slice(0, PRODUCT_SEARCH_MAX_LENGTH)
      : null;
    const base = {
      prediction: {
        label: prediction.label,
        scientificName: prediction.species?.scientificName ?? null,
        speciesSlug: prediction.species?.slug ?? null,
        categorySlug: prediction.category?.slug ?? null,
        confidence: prediction.confidence,
        confidenceLevel: prediction.confidenceLevel,
        features: prediction.features,
      },
      alternatives: prediction.alternatives.map(({ species, confidence }) => ({
        label: species.commonName,
        speciesSlug: species.slug,
        confidence,
      })),
      searchQuery,
    };

    // A low-confidence guess is never shown as a match; the customer gets tips and keyword search.
    if (prediction.confidenceLevel === 'low') {
      return { ...empty, ...base, outcome: 'uncertain' };
    }

    const found = await this.findProducts(prediction, searchQuery);
    if (found) {
      return {
        ...empty,
        ...base,
        outcome: 'matched',
        matchedBy: found.matchedBy,
        products: found.listing.items,
        totalProducts: found.listing.pagination.totalItems,
      };
    }

    const recognised = prediction.species !== null || prediction.category !== null;
    const outcome: VisualSearchOutcome = recognised ? 'no_products' : 'uncertain';
    return { ...empty, ...base, outcome };
  }

  /**
   * Species first, then the category, then the label as keywords; stops at the
   * first step with products. Each step goes through the public listing, so only
   * active products with an offer for sale come back.
   */
  private async findProducts(
    prediction: NormalizedPrediction,
    searchQuery: string | null,
  ): Promise<{ matchedBy: VisualSearchMatchedBy; listing: ProductListingDto } | null> {
    const page = { limit: VISUAL_SEARCH_PRODUCT_LIMIT, sort: 'featured' as const };

    if (prediction.species) {
      const listing = await this.listing.listProducts(page, {
        speciesSlugs: [prediction.species.slug],
      });
      if (listing.items.length > 0) return { matchedBy: 'species', listing };
    }
    if (prediction.category) {
      const listing = await this.listing.listProducts({
        ...page,
        category: prediction.category.slug,
      });
      if (listing.items.length > 0) return { matchedBy: 'category', listing };
    }
    if (searchQuery) {
      const listing = await this.listing.listProducts({ ...page, q: searchQuery });
      if (listing.items.length > 0) return { matchedBy: 'keyword', listing };
    }
    return null;
  }

  /** Every species, and the categories customers can see: active, under an active parent. */
  private async loadContext(): Promise<RecognitionContext> {
    const [species, categories] = await Promise.all([
      this.prisma.seafoodSpecies.findMany({
        orderBy: { commonName: 'asc' },
        select: { slug: true, commonName: true, scientificName: true },
      }),
      this.prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { slug: true, name: true, parent: { select: { isActive: true } } },
      }),
    ]);
    return {
      species,
      categories: categories
        .filter((row) => row.parent?.isActive ?? true)
        .map(({ slug, name }) => ({ slug, name })),
    };
  }

  /**
   * Logs the failure kind and the provider's short reason (for example its HTTP
   * status). Those reasons are fixed sentences: never the key, the image or the
   * model's answer.
   */
  private logFailure(error: unknown): void {
    const detail =
      error instanceof AiProviderError ? `${error.kind}: ${error.message}` : 'unexpected error';
    this.logger.warn(`Visual search recognize failed (${detail})`);
  }
}
