import { Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { ScanRecoveryService } from './scan-recovery.service';
import { PlansGuard } from '../../common/guards/plans.guard';

@Module({
  controllers: [ScansController],
  providers: [ScansService, ScanRecoveryService, PlansGuard],
  exports: [ScansService],
})
export class ScansModule {}
