import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AIProvider } from '@prisma/client';

export class CreateScanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleId?: string;

  @ApiPropertyOptional({ enum: AIProvider, default: AIProvider.GEMINI })
  @IsOptional()
  @IsEnum(AIProvider)
  aiProvider?: AIProvider;
}
