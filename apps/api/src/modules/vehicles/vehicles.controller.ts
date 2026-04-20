import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'List own vehicles' })
  findAll(@CurrentUser('id') userId: string) {
    return this.vehiclesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle details' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.vehiclesService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a vehicle profile' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vehicle' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vehicle' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.vehiclesService.remove(id, userId);
  }
}
