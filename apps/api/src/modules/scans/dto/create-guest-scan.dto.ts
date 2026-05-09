import { IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGuestScanDto {
  @ApiProperty({ description: 'Session ID for tracking guest scan quota' })
  @IsString()
  guestSessionId: string;

  @ApiProperty({ example: 'Honda' }) @IsString() make: string;
  @ApiProperty({ example: 'Civic' }) @IsString() model: string;

  @ApiProperty({ example: 2020 })
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(new Date().getFullYear() + 1)
  year: number;
}
