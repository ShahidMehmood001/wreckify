import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInquiryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() scanId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
}
