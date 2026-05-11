import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { ScanRecoveryService } from './scan-recovery.service';
import { PlansGuard } from '../../common/guards/plans.guard';
import { DetectionProcessor } from '../queue/detection.processor';
import { DETECTION_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: DETECTION_QUEUE })],
  controllers: [ScansController],
  providers: [ScansService, ScanRecoveryService, PlansGuard, DetectionProcessor],
  exports: [ScansService],
})
export class ScansModule {}
