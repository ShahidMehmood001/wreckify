import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkshopServicesDto {
  @ApiProperty({ example: ['Body Work', 'Painting', 'Denting'] })
  @IsArray()
  @IsString({ each: true })
  services: string[];
}
