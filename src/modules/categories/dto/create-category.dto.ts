import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'เครื่องดื่ม', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'หมวดเครื่องดื่มทุกชนิด',
    required: false,
    nullable: true,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
