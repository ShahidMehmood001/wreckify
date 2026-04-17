import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, PlanName } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { addMonths } from '../../common/utils/date.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);

    const freePlan = await this.prisma.plan.findUnique({ where: { name: PlanName.FREE } });
    if (!freePlan) throw new BadRequestException('Plan configuration missing. Run db:seed first.');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        role: dto.role || UserRole.OWNER,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
        subscription: {
          create: {
            planId: freePlan!.id,
            scansUsed: 0,
            resetAt: addMonths(new Date(), 1),
          },
        },
      },
      select: { id: true, email: true, role: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, PlanName.FREE);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { subscription: { include: { plan: true } } },
    });

    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const planName = (user.subscription?.plan?.name || PlanName.FREE) as PlanName;
    const tokens = await this.generateTokens(user.id, user.email, user.role, planName);

    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async googleLogin(googleUser: {
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: { subscription: { include: { plan: true } } },
    });

    if (!user) {
      const freePlan = await this.prisma.plan.findUnique({ where: { name: PlanName.FREE } });
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          role: UserRole.OWNER,
          profile: {
            create: {
              firstName: googleUser.firstName,
              lastName: googleUser.lastName,
              avatarUrl: googleUser.avatarUrl,
            },
          },
          subscription: {
            create: {
              planId: freePlan!.id,
              scansUsed: 0,
              resetAt: addMonths(new Date(), 1),
            },
          },
        },
        include: { subscription: { include: { plan: true } } },
      });
    }

    const planName = (user.subscription?.plan?.name || PlanName.FREE) as PlanName;
    const tokens = await this.generateTokens(user.id, user.email, user.role, planName);

    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { subscription: { include: { plan: true } } },
      });

      if (!user || !user.isActive) throw new UnauthorizedException();

      const planName = (user.subscription?.plan?.name || PlanName.FREE) as PlanName;
      return this.generateTokens(user.id, user.email, user.role, planName);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        profile: true,
        subscription: { include: { plan: true } },
      },
    });
  }

  private async generateTokens(userId: string, email: string, role: UserRole, plan: PlanName) {
    const payload = { sub: userId, email, role, plan };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
