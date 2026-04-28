import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIProvider } from '@prisma/client';

export class UpdateAIConfigDto {
  @ApiProperty({ enum: AIProvider })
  @IsEnum(AIProvider)
  provider: AIProvider;

  @ApiPropertyOptional({ example: 'sk-...' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ example: 'gemini-1.5-flash' })
  @IsOptional()
  @IsString()
  model?: string;
}
