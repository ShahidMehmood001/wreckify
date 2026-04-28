import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryStatus } from '@prisma/client';

export class RespondInquiryDto {
  @ApiProperty({ enum: [InquiryStatus.RESPONDED, InquiryStatus.CLOSED] })
  @IsEnum(InquiryStatus)
  status: InquiryStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
}
