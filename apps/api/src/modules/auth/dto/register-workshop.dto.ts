import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterWorkshopDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Khan' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'ali@workshop.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Khan Auto Works' })
  @IsString()
  workshopName: string;

  @ApiProperty({ example: 'Lahore' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: '12-B, Main Boulevard, Gulberg' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+92-300-1234567' })
  @IsOptional()
  @IsString()
  phone?: string;
}
