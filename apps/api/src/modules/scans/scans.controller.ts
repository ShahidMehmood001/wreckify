import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScansService } from './scans.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { CreateGuestScanDto } from './dto/create-guest-scan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlansGuard } from '../../common/guards/plans.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Scans')
@Controller('scans')
export class ScansController {
  constructor(private scansService: ScansService) {}

  @Public()
  @Post('guest')
  @ApiOperation({ summary: 'Create a guest scan (1 per session, no auth)' })
  createGuestScan(@Body() dto: CreateGuestScanDto) {
    return this.scansService.createGuestScan(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PlansGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new scan' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateScanDto) {
    return this.scansService.create(userId, dto);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add image URLs to a scan (max 5)' })
  addImages(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { images: { url: string; angle?: string }[] },
  ) {
    return this.scansService.addImages(id, userId, body.images);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own scans' })
  findAll(@CurrentUser('id') userId: string) {
    return this.scansService.findAll(userId);
  }

  @Post(':id/detect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger AI damage detection on a scan' })
  triggerDetection(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.scansService.triggerDetection(id, userId);
  }

  @Post(':id/estimate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger cost estimation for a completed scan' })
  triggerEstimation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.scansService.triggerEstimation(id, userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scan details' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.scansService.findOne(id, userId);
  }
}
