import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload images for a scan (max 5, multipart/form-data)' })
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  addImages(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const safeFiles = files ?? [];
    if (safeFiles.length === 0) throw new BadRequestException('At least one image is required');
    return this.scansService.addImages(id, userId, safeFiles);
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
