import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { CreateGuestScanDto } from './dto/create-guest-scan.dto';
import { AIProvider } from '@prisma/client';

@Injectable()
export class ScansService {
  constructor(private prisma: PrismaService) {}

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
