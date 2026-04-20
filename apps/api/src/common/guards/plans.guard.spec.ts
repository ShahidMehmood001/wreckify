import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PlansGuard } from './plans.guard';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  userSubscription: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

function makeContext(userId: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: userId, email: 'test@test.com' } }),
    }),
  } as unknown as ExecutionContext;
}

function makeSubscription(overrides: object = {}) {
  return {
    userId: 'user-1',
    scansUsed: 0,
    resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days future
    plan: { scansPerMonth: 3 },
    ...overrides,
  };
}

describe('PlansGuard', () => {
  let guard: PlansGuard;

  beforeEach(() => {
    guard = new PlansGuard(mockPrisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  it('should allow access when scansUsed < scansPerMonth', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue(makeSubscription({ scansUsed: 1 }));
    await expect(guard.canActivate(makeContext('user-1'))).resolves.toBe(true);
  });

  it('should throw ForbiddenException when monthly limit is reached', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue(makeSubscription({ scansUsed: 3 }));
    await expect(guard.canActivate(makeContext('user-1'))).rejects.toThrow(ForbiddenException);
  });

  it('should return false when user is not authenticated', async () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: null }) }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('should throw ForbiddenException when subscription is missing', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(makeContext('user-1'))).rejects.toThrow(ForbiddenException);
  });

  it('should allow unlimited access when scansPerMonth is -1 (enterprise)', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue(
      makeSubscription({ scansUsed: 9999, plan: { scansPerMonth: -1 } }),
    );
    await expect(guard.canActivate(makeContext('user-1'))).resolves.toBe(true);
  });

  it('should reset quota and allow access when resetAt has passed', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue(
      makeSubscription({ scansUsed: 3, resetAt: new Date(Date.now() - 1000) }),
    );
    mockPrisma.userSubscription.update.mockResolvedValue({});
    await expect(guard.canActivate(makeContext('user-1'))).resolves.toBe(true);
    expect(mockPrisma.userSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, data: expect.objectContaining({ scansUsed: 0 }) }),
    );
  });
});
