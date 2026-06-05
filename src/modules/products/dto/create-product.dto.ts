import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductStatus } from '../../../db/schemas';

export class CreateProductDto {
  @ApiProperty({ example: 'TS-RED-M', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ example: 'เสื้อยืดสีแดง ไซส์ M', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 290, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ example: 120, minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @ApiProperty({ example: 45, minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiProperty({
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiProperty({ example: 'b3f1c2d4-0000-0000-0000-000000000000' })
  @IsUUID()
  categoryId: string;
}
