import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { ChatCard, ChatSource } from '../chat.types.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SendMessageDto {
  /** The visitor's message. The real length limit is CHAT_MAX_MESSAGE_LENGTH; this only bounds the request. */
  @ApiProperty({ example: 'Mình muốn nấu lẩu hải sản cho 4 người, ngân sách 800k' })
  @IsString({ message: 'Tin nhắn không hợp lệ.' })
  @MaxLength(5000, { message: 'Tin nhắn quá dài.' })
  message: string;

  /** Leave out to start a new conversation. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'Mã hội thoại không hợp lệ.' })
  conversationId?: string;
}

export const FEEDBACK_VALUES = ['UP', 'DOWN', 'NONE'] as const;

export class FeedbackDto {
  /** NONE takes the vote back. */
  @ApiProperty({ enum: FEEDBACK_VALUES })
  @IsIn(FEEDBACK_VALUES, { message: 'Đánh giá không hợp lệ.' })
  feedback: (typeof FEEDBACK_VALUES)[number];
}

/** The message a customer leaves for the support team. */
export class HandoffDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'Mã hội thoại không hợp lệ.' })
  conversationId: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Vui lòng nhập tên của bạn.' })
  @MaxLength(150)
  contactName: string;

  /** A phone number or an email address. */
  @ApiProperty({ example: '0901234567' })
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'Vui lòng nhập số điện thoại hoặc email.' })
  @MaxLength(255)
  contact: string;

  @ApiProperty({ example: 'Đơn HSE-12345678 của mình giao chậm, nhờ shop kiểm tra giúp.' })
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'Vui lòng nhập nội dung cần hỗ trợ.' })
  @MaxLength(1000, { message: 'Nội dung tối đa 1000 ký tự.' })
  message: string;
}

export class ChatMessageDto {
  id: string;
  @ApiProperty({ enum: ['USER', 'ASSISTANT'] })
  role: 'USER' | 'ASSISTANT';
  content: string;
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  cards: ChatCard[];
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  sources: ChatSource[];
  @ApiProperty({ enum: ['UP', 'DOWN'], nullable: true })
  feedback: 'UP' | 'DOWN' | null;
  createdAt: string;
}

export class ChatConversationDto {
  @ApiProperty({ format: 'uuid', nullable: true })
  conversationId: string | null;
  messages: ChatMessageDto[];
}
