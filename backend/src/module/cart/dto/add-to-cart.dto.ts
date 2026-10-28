import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'ID of the product or vendor offer to add' })
  @IsString()
  @IsNotEmpty()
  offerId: string;

  @ApiProperty({ description: 'Quantity in kg or units', example: 1 })
  @IsNumber()
  @IsPositive()
  @Min(0.1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Selected seafood preparation option' })
  @IsString()
  @IsOptional()
  preparationOption?: string;
}
