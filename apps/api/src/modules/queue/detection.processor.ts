import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScanStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiClientService } from '../ai-client/ai-client.service';
import { validateDetectResponse } from '../scans/ai-response.validator';
import { DETECTION_QUEUE, DetectionJobData } from './queue.constants';

@Processor(DETECTION_QUEUE)
export class DetectionProcessor extends WorkerHost {
  private readonly logger = new Logger(DetectionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {
    super();
  }

  async process(job: Job<DetectionJobData>): Promise<void> {
    const { scanId, imageUrls, vehicleInfo, provider, apiKey } = job.data;
    this.logger.log(`Processing detection job for scan ${scanId}`);

    try {
      const raw = await this.aiClient.detect({
        scan_id: scanId,
        image_urls: imageUrls,
        vehicle: vehicleInfo,
        provider,
        api_key: apiKey,
      });

      const result = validateDetectResponse(raw);

      await this.prisma.detectedPart.createMany({
        data: result.detected_parts.map((p) => ({
          scanId,
          partName: p.part_name,
          severity: p.severity,
          confidenceScore: p.confidence_score,
          boundingBox: p.bounding_box,
          description: p.description,
        })),
      });

      await this.prisma.scan.update({
        where: { id: scanId },
        data: { status: ScanStatus.COMPLETED },
      });

      this.logger.log(`Detection completed for scan ${scanId}`);
    } catch (err) {
      this.logger.error(`Detection failed for scan ${scanId}`, err);
      await this.prisma.scan.update({
        where: { id: scanId },
        data: { status: ScanStatus.FAILED },
      });
      throw err;
    }
  }
}
