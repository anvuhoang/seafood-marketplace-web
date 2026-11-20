import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  HttpCode,
  HttpStatus,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AUDIO_MAX_BYTES, AUDIO_TOO_LARGE } from './validation/audio-validation.js';
import {
  SmartImportDraftDto,
  SmartImportDraftRequestDto,
  SmartImportStatusDto,
  SmartImportTranscriptDto,
} from './smart-import.dto.js';
import { SmartImportService } from './smart-import.service.js';

/** The upload limit is enforced by multer before our checks run; give its error the same Vietnamese message. */
@Catch(PayloadTooLargeException)
class AudioTooLargeFilter implements ExceptionFilter {
  catch(_error: PayloadTooLargeException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(body: unknown): void } }>()
      .status(HttpStatus.PAYLOAD_TOO_LARGE)
      .json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        error: 'Payload Too Large',
        message: AUDIO_TOO_LARGE,
      });
  }
}

const ApiNoToken = () =>
  ApiResponse({ status: 401, description: 'Missing or invalid token', type: ErrorResponseDto });
const ApiReadOnly = () =>
  ApiResponse({
    status: 403,
    description: 'Not a Vendor account, or the store is suspended or rejected (read-only)',
    type: ErrorResponseDto,
  });

/**
 * Describe a product by text or voice and get an editable draft back. Nothing is
 * saved here: the vendor reviews the draft and saves it with POST /vendors/me/products,
 * which stores it as a draft. The AI key never leaves the server.
 */
@ApiTags('Vendor smart import')
@ApiBearerAuth()
@Roles('VENDOR')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors/me/smart-import')
export class SmartImportController {
  constructor(private readonly smartImport: SmartImportService) {}

  @Get('status')
  @ApiOperation({ summary: 'Whether AI product import is available' })
  @ApiResponse({ status: 200, type: SmartImportStatusDto })
  @ApiNoToken()
  status(): SmartImportStatusDto {
    return { enabled: this.smartImport.isEnabled() };
  }

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @UseFilters(AudioTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('audio', {
      // Kept in memory and never written to disk; bigger files are refused while uploading.
      limits: { fileSize: AUDIO_MAX_BYTES, files: 1 },
    }),
  )
  @ApiOperation({
    summary: 'Turn a short voice recording into text',
    description:
      'The text is only a suggestion: the vendor can correct it before asking for a draft. The recording is not stored.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio'],
      properties: { audio: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, type: SmartImportTranscriptDto })
  @ApiResponse({
    status: 400,
    description: 'Missing, empty, oversized or non-audio file',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiReadOnly()
  @ApiResponse({ status: 429, description: 'Too many requests, or the AI quota is used up', type: ErrorResponseDto })
  @ApiResponse({ status: 502, description: 'No speech could be recognised', type: ErrorResponseDto })
  @ApiResponse({ status: 503, description: 'AI import is not configured', type: ErrorResponseDto })
  async transcribe(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: { buffer?: Buffer } | undefined,
  ): Promise<SmartImportTranscriptDto> {
    return { text: await this.smartImport.transcribe(userId, file) };
  }

  @Post('draft')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Build an editable product draft from a description',
    description:
      'Not saved. Fields the vendor did not mention are null and listed in `missing`. Prices and stock are checked, and values that look wrong come back in `warnings`.',
  })
  @ApiResponse({ status: 200, type: SmartImportDraftDto })
  @ApiResponse({ status: 400, description: 'Text missing, too short or too long', type: ErrorResponseDto })
  @ApiNoToken()
  @ApiReadOnly()
  @ApiResponse({ status: 429, description: 'Too many requests, or the AI quota is used up', type: ErrorResponseDto })
  @ApiResponse({ status: 502, description: 'The AI answer could not be read', type: ErrorResponseDto })
  @ApiResponse({ status: 503, description: 'AI import is not configured', type: ErrorResponseDto })
  @ApiResponse({ status: 504, description: 'The AI service did not answer in time', type: ErrorResponseDto })
  async draft(
    @CurrentUser('sub') userId: string,
    @Body() dto: SmartImportDraftRequestDto,
  ): Promise<SmartImportDraftDto> {
    return this.smartImport.createDraft(userId, dto.text);
  }
}
