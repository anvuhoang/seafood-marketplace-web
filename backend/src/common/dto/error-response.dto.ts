import { ApiProperty } from '@nestjs/swagger';

/** Body of every error response (Nest's default exception format). */
export class ErrorResponseDto {
  /** @example 404 */
  statusCode: number;

  @ApiProperty({
    description:
      'A readable message in Vietnamese. Validation errors (400) return one message per invalid field instead.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Sản phẩm không tồn tại hoặc chưa được mở bán.',
  })
  message: string | string[];

  /** @example "Not Found" */
  error: string;
}
