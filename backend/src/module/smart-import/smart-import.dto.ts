import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export const SMART_IMPORT_TEXT_MIN = 3;
export const SMART_IMPORT_TEXT_MAX = 2000;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SmartImportDraftRequestDto {
  /** What the vendor typed or said. @example "Tôm sú size 30, 350k một ký, còn 40 ký" */
  @ApiProperty({
    minLength: SMART_IMPORT_TEXT_MIN,
    maxLength: SMART_IMPORT_TEXT_MAX,
  })
  @Transform(trim)
  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mô tả sản phẩm.' })
  @MinLength(SMART_IMPORT_TEXT_MIN, {
    message: 'Mô tả quá ngắn, hãy nói rõ hơn về sản phẩm.',
  })
  @MaxLength(SMART_IMPORT_TEXT_MAX, {
    message: 'Mô tả tối đa 2000 ký tự.',
  })
  text: string;
}

export class SmartImportStatusDto {
  /** False until the AI service is configured; the UI then hides the feature. @example true */
  enabled: boolean;
}

export class SmartImportTranscriptDto {
  /** The recognised text. The vendor can correct it before asking for a draft. @example "Tôm sú size 30, giá 350 nghìn một ký" */
  text: string;
  /** Which engine heard it: "groq", "mock" or "local:<model>" for our own speech service. @example "local:whisper-small" */
  engine: string;
}

export class SmartImportVariantDto {
  /** @example "Size 30" */
  name: string;
  /** Empty when the vendor did not say. @example "kg" */
  unit: string;
  /** @example "30 con/kg" */
  sizeLabel: string | null;
  /** VND per unit, null when missing or unusable. @example 350000 */
  price: number | null;
  /** In the variant's unit, null when missing or unusable. @example 40 */
  stock: number | null;
}

export class SmartImportDraftDto {
  /** Empty when the vendor did not say. @example "Tôm sú" */
  name: string;
  /** @example "Bắt sáng nay ở Cà Mau" */
  description: string | null;
  /** One of the active categories, or null. */
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  categoryId: string | null;
  variants: SmartImportVariantDto[];
  /** Fields the vendor still has to fill in. */
  @ApiProperty({
    enum: ['name', 'category', 'unit', 'price', 'stock'],
    isArray: true,
  })
  missing: ('name' | 'category' | 'unit' | 'price' | 'stock')[];
  /** Things worth a second look, in Vietnamese. */
  warnings: string[];
}
