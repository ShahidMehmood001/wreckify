import { IsString, IsInt, IsOptional, IsIn, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PAKISTAN_CAR_MAKES } from '../../../common/constants/pakistan-cars.constant';
import { IsPakistanModel } from '../../../common/validators/is-pakistan-model.validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Suzuki', enum: PAKISTAN_CAR_MAKES })
  @IsString()
  @IsIn(PAKISTAN_CAR_MAKES, { message: `make must be one of: ${PAKISTAN_CAR_MAKES.join(', ')}` })
  make: string;

  @ApiProperty({ example: 'Alto' })
  @IsString()
  @IsPakistanModel()
  model: string;

  @ApiProperty({ example: 2022 })
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiPropertyOptional({ example: 'White' }) @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional({ example: 'ABC-123' }) @IsOptional() @IsString() registrationNo?: string;
}
