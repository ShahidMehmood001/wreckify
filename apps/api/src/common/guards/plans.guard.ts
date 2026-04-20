import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { addMonths } from '../utils/date.util';

@Injectable()
export class PlansGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    });

    if (!subscription) throw new ForbiddenException('No active subscription found');

    if (subscription.plan.scansPerMonth === -1) return true;

    if (new Date() > subscription.resetAt) {
      await this.prisma.userSubscription.update({
        where: { userId: user.id },
        data: { scansUsed: 0, resetAt: addMonths(new Date(), 1) },
      });
      return true;
    }

    if (subscription.scansUsed >= subscription.plan.scansPerMonth) {
      throw new ForbiddenException(
        `Monthly scan limit reached (${subscription.plan.scansPerMonth} scans). Upgrade your plan to continue.`,
      );
    }

    return true;
  }
}
