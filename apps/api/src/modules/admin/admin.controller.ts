import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, WorkshopStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class ChangeRoleDto {
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
}

class SetStatusDto {
  @ApiProperty() isActive: boolean;
}

class SetWorkshopStatusDto {
  @ApiProperty({ enum: WorkshopStatus }) @IsEnum(WorkshopStatus) status: WorkshopStatus;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.listUsers(Number(page), Number(limit));
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change user role' })
  changeRole(@Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.adminService.changeUserRole(id, dto.role);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Suspend or activate user' })
  setStatus(@Param('id') id: string, @Body() dto: SetStatusDto) {
    return this.adminService.setUserStatus(id, dto.isActive);
  }

  @Get('workshops')
  @ApiOperation({ summary: 'List all workshops' })
  @ApiQuery({ name: 'status', enum: WorkshopStatus, required: false })
  listWorkshops(@Query('status') status?: WorkshopStatus) {
    return this.adminService.listWorkshops(status);
  }

  @Patch('workshops/:id/status')
  @ApiOperation({ summary: 'Approve or reject a workshop' })
  setWorkshopStatus(@Param('id') id: string, @Body() dto: SetWorkshopStatusDto) {
    return this.adminService.setWorkshopStatus(id, dto.status);
  }

  @Get('scraper/logs')
  @ApiOperation({ summary: 'View scraper run logs' })
  getScraperLogs() {
    return this.adminService.getScraperLogs();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Platform analytics overview' })
  getAnalytics() {
    return this.adminService.getAnalytics();
  }
}
