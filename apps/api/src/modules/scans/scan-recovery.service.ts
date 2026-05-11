import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ScanStatus } from '@prisma/client';

const STUCK_THRESHOLD_MINUTES = 5;

@Injectable()
export class ScanRecoveryService {
  private readonly logger = new Logger(ScanRecoveryService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async recoverStuckScans() {
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);

    const result = await this.prisma.scan.updateMany({
      where: {
        status: ScanStatus.PROCESSING,
        updatedAt: { lt: cutoff },
      },
      data: { status: ScanStatus.FAILED },
    });

    if (result.count > 0) {
      this.logger.warn(`Recovered ${result.count} stuck scan(s) — reset PROCESSING→FAILED`);
    }
  }
}
