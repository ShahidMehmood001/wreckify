import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { generateReportHtml } from './templates/report.template';
import { UserRole } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly reportsDir: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.reportsDir = path.join(process.cwd(), 'generated-reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async generate(scanId: string, userId: string, userRole: UserRole) {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      include: { vehicle: true, detectedParts: true, costEstimate: true },
    });

    if (!scan) throw new NotFoundException('Scan not found');
    if (scan.userId !== userId) throw new ForbiddenException();
    if (scan.status !== 'COMPLETED') {
      throw new BadRequestException('Scan must be completed before generating a report');
    }

    const existing = await this.prisma.report.findUnique({ where: { scanId } });
    if (existing) return existing;

    const reportType = userRole === UserRole.INSURANCE_AGENT ? 'insurance' : 'standard';
    const html = generateReportHtml({
      scan,
      vehicle: scan.vehicle,
      detectedParts: scan.detectedParts,
      costEstimate: scan.costEstimate,
      generatedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
      type: reportType,
    });

    const fileName = `report-${scanId}-${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: this.config.get('PUPPETEER_EXECUTABLE_PATH') || undefined,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm' } });
      fs.writeFileSync(filePath, pdfBuffer);
    } finally {
      await browser.close();
    }

    const stats = fs.statSync(filePath);

    return this.prisma.report.create({
      data: {
        scanId,
        type: reportType,
        fileUrl: `/reports/files/${fileName}`,
        fileSize: stats.size,
      },
    });
  }

  async getReport(scanId: string, userId: string) {
    const scan = await this.prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan || scan.userId !== userId) throw new ForbiddenException();

    const report = await this.prisma.report.findUnique({ where: { scanId } });
    if (!report) throw new NotFoundException('Report not found. Generate it first.');
    return report;
  }

  async listReports(userId: string) {
    return this.prisma.report.findMany({
      where: { scan: { userId } },
      include: { scan: { select: { id: true, createdAt: true, vehicle: { select: { make: true, model: true, year: true } } } } },
      orderBy: { generatedAt: 'desc' },
    });
  }

  getFilePath(fileName: string): string {
    return path.join(this.reportsDir, fileName);
  }
}
