import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { RespondInquiryDto } from './dto/respond-inquiry.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Workshops')
@Controller('workshops')
export class WorkshopsController {
  constructor(private workshopsService: WorkshopsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse approved workshops' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'service', required: false })
  findAll(@Query('city') city?: string, @Query('service') service?: string) {
    return this.workshopsService.findAll(city, service);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get workshop profile' })
  findOne(@Param('id') id: string) {
    return this.workshopsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MECHANIC)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a workshop (Mechanic only)' })
  register(@CurrentUser('id') userId: string, @Body() dto: CreateWorkshopDto) {
    return this.workshopsService.register(userId, dto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MECHANIC)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own workshop (Mechanic only)' })
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateWorkshopDto) {
    return this.workshopsService.update(userId, dto);
  }

  @Post(':id/inquiries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send repair inquiry to workshop (Owner only)' })
  createInquiry(
    @Param('id') workshopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInquiryDto,
  ) {
    return this.workshopsService.createInquiry(workshopId, userId, dto);
  }

  @Get('my/inquiries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MECHANIC)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inquiries for own workshop (Mechanic only)' })
  getInquiries(@CurrentUser('id') userId: string) {
    return this.workshopsService.getInquiries(userId);
  }

  @Patch('inquiries/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MECHANIC)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Respond to an inquiry (Mechanic only)' })
  respondToInquiry(
    @Param('id') inquiryId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RespondInquiryDto,
  ) {
    return this.workshopsService.respondToInquiry(inquiryId, userId, dto);
  }
}
