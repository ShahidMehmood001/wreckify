import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { RespondInquiryDto } from './dto/respond-inquiry.dto';
import { WorkshopStatus } from '@prisma/client';

@Injectable()
export class WorkshopsService {
  constructor(private prisma: PrismaService) {}

  async findAll(city?: string, service?: string) {
    return this.prisma.workshop.findMany({
      where: {
        status: WorkshopStatus.APPROVED,
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
        ...(service && {
          services: { some: { name: { contains: service, mode: 'insensitive' } } },
        }),
      },
      include: {
        services: true,
        _count: { select: { inquiries: true } },
      },
      orderBy: { rating: { sort: 'desc', nulls: 'last' } },
    });
  }

  async findOne(id: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id },
      include: { services: true },
    });
    if (!workshop) throw new NotFoundException('Workshop not found');
    return workshop;
  }

  async register(userId: string, dto: CreateWorkshopDto) {
    const existing = await this.prisma.workshop.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('You already have a registered workshop');

    const { services, ...workshopData } = dto;

    return this.prisma.workshop.create({
      data: {
        userId,
        ...workshopData,
        services: services?.length
          ? { create: services.map((name) => ({ name })) }
          : undefined,
      },
      include: { services: true },
    });
  }

  async update(userId: string, dto: UpdateWorkshopDto) {
    const workshop = await this.prisma.workshop.findUnique({ where: { userId } });
    if (!workshop) throw new NotFoundException('Workshop not found');

    const { services, ...workshopData } = dto;

    if (services !== undefined) {
      await this.prisma.workshopService.deleteMany({ where: { workshopId: workshop.id } });
    }

    return this.prisma.workshop.update({
      where: { id: workshop.id },
      data: {
        ...workshopData,
        ...(services !== undefined && {
          services: { create: services.map((name) => ({ name })) },
        }),
      },
      include: { services: true },
    });
  }

  async createInquiry(workshopId: string, senderId: string, dto: CreateInquiryDto) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop || workshop.status !== WorkshopStatus.APPROVED) {
      throw new NotFoundException('Workshop not found');
    }

    return this.prisma.repairInquiry.create({
      data: { workshopId, senderId, ...dto },
    });
  }

  async getInquiries(userId: string) {
    const workshop = await this.prisma.workshop.findUnique({ where: { userId } });
    if (!workshop) throw new NotFoundException('Workshop not found');

    return this.prisma.repairInquiry.findMany({
      where: { workshopId: workshop.id },
      include: {
        sender: { select: { id: true, email: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondToInquiry(inquiryId: string, userId: string, dto: RespondInquiryDto) {
    const workshop = await this.prisma.workshop.findUnique({ where: { userId } });
    if (!workshop) throw new NotFoundException('Workshop not found');

    const inquiry = await this.prisma.repairInquiry.findUnique({ where: { id: inquiryId } });
    if (!inquiry || inquiry.workshopId !== workshop.id) {
      throw new ForbiddenException('Inquiry not found or does not belong to your workshop');
    }

    return this.prisma.repairInquiry.update({
      where: { id: inquiryId },
      data: { status: dto.status, message: dto.message },
    });
  }
}
