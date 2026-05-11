import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListWorkshopsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Lahore' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Painting' })
  @IsOptional()
  @IsString()
  service?: string;
}
