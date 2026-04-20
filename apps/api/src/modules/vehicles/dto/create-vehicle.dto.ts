import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Suzuki' }) @IsString() make: string;
  @ApiProperty({ example: 'Alto' }) @IsString() model: string;

  @ApiProperty({ example: 2022 })
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiPropertyOptional({ example: 'White' }) @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional({ example: 'ABC-123' }) @IsOptional() @IsString() registrationNo?: string;
}
