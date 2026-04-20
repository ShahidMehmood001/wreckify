import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiClientService } from '../ai-client/ai-client.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { CreateGuestScanDto } from './dto/create-guest-scan.dto';
import { AIProvider, ScanStatus } from '@prisma/client';
import { decrypt } from '../../common/utils/encryption.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScansService {
  constructor(
    private prisma: PrismaService,
    private aiClient: AiClientService,
    private config: ConfigService,
  ) {}

  async createGuestScan(dto: CreateGuestScanDto) {
    if (dto.guestSessionId) {
      const existing = await this.prisma.scan.count({
        where: { guestSessionId: dto.guestSessionId, isGuest: true },
      });
      if (existing >= 1) {
        throw new ForbiddenException(
          'Guest scan limit reached. Register for free to get 3 scans/month.',
        );
      }
    }

    return this.prisma.scan.create({
      data: {
        isGuest: true,
        guestSessionId: dto.guestSessionId,
        aiProvider: AIProvider.GEMINI,
      },
    });
  }

  async create(userId: string, dto: CreateScanDto) {
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
      if (!vehicle || vehicle.userId !== userId) {
        throw new ForbiddenException('Vehicle not found or does not belong to you');
      }
    }

    const scan = await this.prisma.scan.create({
      data: {
        userId,
        vehicleId: dto.vehicleId,
        aiProvider: dto.aiProvider || AIProvider.GEMINI,
      },
    });

    await this.prisma.userSubscription.update({
      where: { userId },
      data: { scansUsed: { increment: 1 } },
    });

    return scan;
  }

  async addImages(scanId: string, userId: string, images: { url: string; angle?: string }[]) {
    const scan = await this.getScanOrThrow(scanId, userId);

    if (scan.images.length + images.length > 5) {
      throw new BadRequestException('Maximum 5 images allowed per scan');
    }

    await this.prisma.scanImage.createMany({
      data: images.map((img, i) => ({
        scanId,
        url: img.url,
        angle: img.angle,
        order: scan.images.length + i,
      })),
    });

    return this.prisma.scan.findUnique({
      where: { id: scanId },
      include: { images: { orderBy: { order: 'asc' } } },
    });
  }

  async triggerDetection(scanId: string, userId: string) {
    const scan = await this.getScanOrThrow(scanId, userId);

    if (!scan.images.length) {
      throw new BadRequestException('Upload at least one image before running detection');
    }

    await this.prisma.scan.update({ where: { id: scanId }, data: { status: ScanStatus.PROCESSING } });

    try {
      const { provider, apiKey } = await this.resolveAiConfig(userId, scan.aiProvider);

      const result = await this.aiClient.detect({
        scan_id: scanId,
        image_urls: scan.images.map((i) => i.url),
        provider,
        api_key: apiKey,
      });

      await this.prisma.detectedPart.createMany({
        data: result.detected_parts.map((p: any) => ({
          scanId,
          partName: p.part_name,
          severity: p.severity,
          confidenceScore: p.confidence_score,
          boundingBox: p.bounding_box,
          description: p.description,
        })),
      });

      await this.prisma.scan.update({ where: { id: scanId }, data: { status: ScanStatus.COMPLETED } });
      return this.getScanOrThrow(scanId, userId);
    } catch (err) {
      await this.prisma.scan.update({ where: { id: scanId }, data: { status: ScanStatus.FAILED } });
      throw err;
    }
  }

  async triggerEstimation(scanId: string, userId: string) {
    const scan = await this.getScanOrThrow(scanId, userId);

    if (!scan.detectedParts.length) {
      throw new BadRequestException('Run damage detection before requesting a cost estimate');
    }

    if (scan.costEstimate) return scan.costEstimate;

    const { provider, apiKey } = await this.resolveAiConfig(userId, scan.aiProvider);

    const userProfile = await this.prisma.userProfile.findUnique({ where: { userId } });

    const result = await this.aiClient.estimate({
      scan_id: scanId,
      detected_parts: scan.detectedParts.map((p) => ({
        part_name: p.partName,
        severity: p.severity,
        confidence_score: p.confidenceScore,
        bounding_box: p.boundingBox,
        description: p.description,
      })),
      vehicle: scan.vehicle
        ? { make: scan.vehicle.make, model: scan.vehicle.model, year: scan.vehicle.year }
        : undefined,
      provider,
      api_key: apiKey,
      city: userProfile?.city || 'Lahore',
    });

    return this.prisma.costEstimate.create({
      data: {
        scanId,
        totalMin: result.total_min,
        totalMax: result.total_max,
        currency: result.currency,
        lineItems: result.line_items,
        narrative: result.narrative,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.scan.findMany({
      where: { userId },
      include: {
        vehicle: { select: { make: true, model: true, year: true } },
        images: { select: { url: true, angle: true }, orderBy: { order: 'asc' }, take: 1 },
        _count: { select: { detectedParts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(scanId: string, userId: string) {
    return this.getScanOrThrow(scanId, userId);
  }

  private async resolveAiConfig(userId: string, defaultProvider: AIProvider) {
    const aiConfig = await this.prisma.userAIConfig.findUnique({ where: { userId } });
    const encKey = this.config.get<string>('encryptionKey') || '';

    if (aiConfig?.apiKeyHash) {
      try {
        const decryptedKey = decrypt(aiConfig.apiKeyHash, encKey);
        return { provider: aiConfig.provider as string, apiKey: decryptedKey };
      } catch {
        // fall through to default
      }
    }

    return { provider: defaultProvider as string, apiKey: undefined };
  }

  private async getScanOrThrow(scanId: string, userId: string) {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        vehicle: true,
        images: { orderBy: { order: 'asc' } },
        detectedParts: true,
        costEstimate: true,
        report: true,
      },
    });

    if (!scan) throw new NotFoundException('Scan not found');
    if (scan.userId !== userId) throw new ForbiddenException();
    return scan;
  }
}
