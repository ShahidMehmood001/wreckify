import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIProvider } from '@prisma/client';

export class CreateScanDto {
  @ApiProperty({ description: 'Vehicle ID (must belong to the authenticated user)' })
  @IsString()
  vehicleId: string;

  @ApiPropertyOptional({ enum: AIProvider, default: AIProvider.GEMINI })
  @IsOptional()
  @IsEnum(AIProvider)
  aiProvider?: AIProvider;
}
