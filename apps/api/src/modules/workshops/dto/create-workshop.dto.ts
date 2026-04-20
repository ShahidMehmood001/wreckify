import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkshopDto {
  @ApiProperty({ example: 'Ali Auto Workshop' }) @IsString() name: string;
  @ApiProperty({ example: 'Lahore' }) @IsString() city: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ example: ['Body Work', 'Painting', 'Denting'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];
}
