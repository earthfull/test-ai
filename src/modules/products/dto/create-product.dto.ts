import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductStatus } from '../../../db/schemas';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const upperTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

// เพดานราคา/จำนวน เพื่อกันค่าผิดปกติ (overflow / พิมพ์ผิด)
const MAX_MONEY = 1_000_000;
const MAX_STOCK = 1_000_000;

export class CreateProductDto {
  @ApiProperty({ example: 'TS-RED-M', maxLength: 50 })
  @Transform(upperTrim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'sku ต้องประกอบด้วย A-Z, 0-9 และ - เท่านั้น',
  })
  sku: string;

  @ApiProperty({ example: 'เสื้อยืดสีแดง ไซส์ M', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 1000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 290, minimum: 0, maximum: MAX_MONEY })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  price: number;

  @ApiProperty({ example: 120, minimum: 0, maximum: MAX_MONEY, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  cost?: number;

  @ApiProperty({ example: 45, minimum: 0, maximum: MAX_STOCK, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK)
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

  @ApiProperty({
    example: 'c4a2d3e5-0000-0000-0000-000000000000',
    required: false,
    nullable: true,
    description: 'ร้านค้าที่สินค้านี้สังกัด (ใส่ทีหลังได้)',
  })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}
