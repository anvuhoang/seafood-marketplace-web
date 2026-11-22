import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ReviewService } from './review.service.js';
import { CreateReviewDto } from './dto/review.dto.js';
import type { ReviewCenterDto, ReviewUploadSignatureDto, SubmittedReviewDto } from './dto/review.dto.js';
import { RateLimit } from '../../infra/rate-limit.guard.js';

/** The signed-in customer's reviews of delivered order items. */
@ApiTags('Account reviews')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Missing or invalid token' })
@UseGuards(JwtAuthGuard)
@Controller('account/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ApiOperation({ summary: 'Items waiting for my review, my reviews and totals' })
  getReviewCenter(@CurrentUser('sub') userId: string): Promise<ReviewCenterDto> {
    return this.reviewService.getReviewCenter(userId);
  }

  @RateLimit(10, 60)
  @Post()
  @ApiOperation({ summary: 'Review a delivered order item' })
  @ApiResponse({ status: 400, description: 'Order not delivered yet or invalid images' })
  @ApiResponse({ status: 404, description: 'Order item not found or not mine' })
  @ApiResponse({ status: 409, description: 'Already reviewed' })
  createReview(@CurrentUser('sub') userId: string, @Body() dto: CreateReviewDto): Promise<SubmittedReviewDto> {
    return this.reviewService.createReview(userId, dto);
  }

  @RateLimit(20, 60)
  @Post('upload-signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signature for uploading one review photo directly to Cloudinary' })
  @ApiResponse({ status: 503, description: 'Image upload is not configured' })
  createUploadSignature(@CurrentUser('sub') userId: string): ReviewUploadSignatureDto {
    return this.reviewService.createUploadSignature(userId);
  }
}
