import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InquiryStatus } from '@prisma/client';

export class RespondInquiryDto {
  @ApiProperty({ enum: [InquiryStatus.RESPONDED, InquiryStatus.CLOSED] })
  @IsEnum(InquiryStatus)
  status: InquiryStatus;

  @ApiProperty() @IsString() message: string;
}
