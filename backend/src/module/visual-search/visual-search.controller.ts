import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  HttpCode,
  HttpStatus,
  PayloadTooLargeException,
  Post,
  Req,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { VisualSearchResultDto, VisualSearchStatusDto } from './dto/visual-search.dto.js';
import { IMAGE_MAX_BYTES, IMAGE_TOO_LARGE } from './image-validation.js';
import { VisualSearchService } from './visual-search.service.js';

/** The upload limit is enforced by multer before our checks run; give its error the same Vietnamese message. */
@Catch(PayloadTooLargeException)
class ImageTooLargeFilter implements ExceptionFilter {
  catch(_error: PayloadTooLargeException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(body: unknown): void } }>()
      .status(HttpStatus.PAYLOAD_TOO_LARGE)
      .json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        error: 'Payload Too Large',
        message: IMAGE_TOO_LARGE,
      });
  }
}

/**
 * Find seafood from a photo. Public, because guests can browse products too;
 * a per-user / per-IP limit and a server-wide cap protect the AI quota. The
 * photo is only held in memory for the call: never written to disk, stored or logged.
 */
@ApiTags('Visual search')
@Controller('visual-search')
export class VisualSearchController {
  constructor(private readonly visualSearch: VisualSearchService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Whether search by photo is available' })
  @ApiResponse({ status: 200, type: VisualSearchStatusDto })
  status(): VisualSearchStatusDto {
    return { enabled: this.visualSearch.isEnabled() };
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseFilters(ImageTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('image', {
      // Kept in memory and never written to disk; bigger files are refused while uploading.
      limits: { fileSize: IMAGE_MAX_BYTES, files: 1 },
    }),
  )
  @ApiOperation({
    summary: 'Recognise the seafood in a photo and list matching products',
    description:
      'The recognition is a suggestion from an AI model and may be wrong. Products are real catalogue products for sale, ' +
      'found by species, then category, then keywords. A bearer token is optional: with one, the limit counts per user; without, per IP.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary', description: 'JPEG, PNG or WebP, at most 4MB' },
      },
    },
  })
  @ApiResponse({ status: 200, type: VisualSearchResultDto })
  @ApiResponse({
    status: 400,
    description: 'Missing, empty, too small or not a JPEG/PNG/WebP image',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 413, description: 'Image over 4MB', type: ErrorResponseDto })
  @ApiResponse({
    status: 429,
    description: 'Too many searches from this user/IP or the server, or the AI quota is used up',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 502, description: 'The AI answer could not be read', type: ErrorResponseDto })
  @ApiResponse({
    status: 503,
    description: 'Search by photo is switched off or not configured',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 504, description: 'The AI service did not answer in time', type: ErrorResponseDto })
  search(
    @UploadedFile() file: { buffer?: Buffer } | undefined,
    @Req() request: Request,
  ): Promise<VisualSearchResultDto> {
    return this.visualSearch.search(file, {
      authorization: request.headers.authorization,
      ip: request.ip,
    });
  }
}
