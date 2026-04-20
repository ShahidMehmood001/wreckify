import { Controller, Get, Post, Param, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post(':scanId')
  @ApiOperation({ summary: 'Generate PDF report for a completed scan' })
  generate(
    @Param('scanId') scanId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.reportsService.generate(scanId, userId, role);
  }

  @Get()
  @ApiOperation({ summary: 'List own reports' })
  listReports(@CurrentUser('id') userId: string) {
    return this.reportsService.listReports(userId);
  }

  @Get(':scanId')
  @ApiOperation({ summary: 'Get report metadata for a scan' })
  getReport(@Param('scanId') scanId: string, @CurrentUser('id') userId: string) {
    return this.reportsService.getReport(scanId, userId);
  }

  @Get('files/:fileName')
  @ApiOperation({ summary: 'Download PDF file' })
  async downloadFile(@Param('fileName') fileName: string, @Res() res: Response) {
    const filePath = this.reportsService.getFilePath(fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    fs.createReadStream(filePath).pipe(res);
  }
}
