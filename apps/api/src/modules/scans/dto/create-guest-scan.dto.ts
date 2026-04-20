import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGuestScanDto {
  @ApiPropertyOptional({ description: 'Session ID for tracking guest scan quota' })
  @IsOptional()
  @IsString()
  guestSessionId?: string;
}
