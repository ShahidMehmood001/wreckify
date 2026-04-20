import { Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { PlansGuard } from '../../common/guards/plans.guard';

@Module({
  controllers: [ScansController],
  providers: [ScansService, PlansGuard],
  exports: [ScansService],
})
export class ScansModule {}
