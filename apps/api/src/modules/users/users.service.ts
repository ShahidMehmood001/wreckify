import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAIConfigDto } from './dto/update-ai-config.dto';
import { PlanName } from '@prisma/client';
import { encrypt } from '../../common/utils/encryption.util';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  async getSubscription(userId: string) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  async updateAIConfig(userId: string, dto: UpdateAIConfigDto) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    const features = subscription?.plan?.features as any;
    if (!features?.byok) {
      throw new ForbiddenException('BYOK is not available on your current plan. Upgrade to Pro or above.');
    }

    const encryptionKey = this.config.get<string>('encryptionKey') || '';
    const encryptedKey = encrypt(dto.apiKey, encryptionKey);

    return this.prisma.userAIConfig.upsert({
      where: { userId },
      update: { provider: dto.provider, model: dto.model, apiKeyHash: encryptedKey },
      create: { userId, provider: dto.provider, model: dto.model, apiKeyHash: encryptedKey },
      select: { id: true, provider: true, model: true, updatedAt: true },
    });
  }
}
