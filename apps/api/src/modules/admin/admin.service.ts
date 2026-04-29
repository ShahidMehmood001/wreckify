import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, WorkshopStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true, email: true, role: true, isActive: true, createdAt: true,
          profile: { select: { firstName: true, lastName: true } },
          subscription: { select: { scansUsed: true, plan: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { users, total, page, limit };
  }

  async changeUserRole(userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id: userId }, data: { role } });
  }

  async setUserStatus(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id: userId }, data: { isActive } });
  }

  async listWorkshops(page = 1, limit = 20, status?: WorkshopStatus) {
    const skip = (page - 1) * limit;
    const [workshops, total] = await Promise.all([
      this.prisma.workshop.findMany({
        where: status ? { status } : undefined,
        include: {
          user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
          services: true,
          _count: { select: { inquiries: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.workshop.count({ where: status ? { status } : undefined }),
    ]);
    return { workshops, total, page, limit };
  }

  async setWorkshopStatus(workshopId: string, status: WorkshopStatus) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) throw new NotFoundException('Workshop not found');
    return this.prisma.workshop.update({ where: { id: workshopId }, data: { status } });
  }

  async getScraperLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.scraperLog.findMany({
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.scraperLog.count(),
    ]);
    return { logs, total, page, limit };
  }

  async getAnalytics() {
    const [
      totalUsers,
      totalScans,
      completedScans,
      totalReports,
      totalWorkshops,
      approvedWorkshops,
      scansByStatus,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.scan.count(),
      this.prisma.scan.count({ where: { status: 'COMPLETED' } }),
      this.prisma.report.count(),
      this.prisma.workshop.count(),
      this.prisma.workshop.count({ where: { status: WorkshopStatus.APPROVED } }),
      this.prisma.scan.groupBy({ by: ['status'], _count: { status: true } }),
    ]);

    return {
      users: { total: totalUsers },
      scans: {
        total: totalScans,
        completed: completedScans,
        byStatus: scansByStatus.map((s) => ({ status: s.status, count: s._count.status })),
      },
      reports: { total: totalReports },
      workshops: { total: totalWorkshops, approved: approvedWorkshops },
    };
  }
}
