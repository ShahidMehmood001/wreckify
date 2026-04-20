import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn() },
  plan: { findUnique: jest.fn() },
};

const mockJwt = { signAsync: jest.fn().mockResolvedValue('signed-token'), verify: jest.fn() };
const mockConfig = { get: jest.fn().mockReturnValue('test-secret') };

const FREE_PLAN = { id: 'plan-free', name: 'FREE' };

const MOCK_USER = {
  id: 'user-1',
  email: 'ali@example.com',
  password: bcrypt.hashSync('password123', 10),
  role: 'OWNER',
  isActive: true,
  subscription: { plan: { name: 'FREE' } },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockJwt as unknown as JwtService,
      mockConfig as unknown as ConfigService,
    );
    jest.clearAllMocks();
    mockJwt.signAsync.mockResolvedValue('signed-token');
    mockConfig.get.mockReturnValue('test-secret');
  });

  // ─── register ────────────────────────────────────────────────

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.plan.findUnique.mockResolvedValue(FREE_PLAN);
      mockPrisma.user.create.mockResolvedValue({ id: 'user-new', email: 'new@test.com', role: 'OWNER' });

      const result = await service.register({
        email: 'new@test.com',
        password: 'password123',
        firstName: 'Ali',
        lastName: 'Khan',
      });

      expect(result.user.email).toBe('new@test.com');
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      await expect(
        service.register({ email: 'ali@example.com', password: 'p', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when FREE plan is not seeded', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.plan.findUnique.mockResolvedValue(null);
      await expect(
        service.register({ email: 'new@test.com', password: 'p', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should hash the password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.plan.findUnique.mockResolvedValue(FREE_PLAN);
      mockPrisma.user.create.mockResolvedValue({ id: 'u', email: 'x@y.com', role: 'OWNER' });

      await service.register({ email: 'x@y.com', password: 'plaintext', firstName: 'X', lastName: 'Y' });

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe('plaintext');
      const isHashed = await bcrypt.compare('plaintext', createCall.data.password);
      expect(isHashed).toBe(true);
    });
  });

  // ─── login ────────────────────────────────────────────────────

  describe('login', () => {
    it('should return user and tokens on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      const result = await service.login({ email: 'ali@example.com', password: 'password123' });
      expect(result.user.email).toBe('ali@example.com');
      expect(result.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'ghost@test.com', password: 'x' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      await expect(service.login({ email: 'ali@example.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when account is deactivated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...MOCK_USER, isActive: false });
      await expect(
        service.login({ email: 'ali@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no password (Google account)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...MOCK_USER, password: null });
      await expect(
        service.login({ email: 'ali@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── refresh ──────────────────────────────────────────────────

  describe('refresh', () => {
    it('should return new tokens on valid refresh token', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      const result = await service.refresh('valid-refresh-token');
      expect(result.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException on invalid refresh token', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('invalid'); });
      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is deactivated', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ ...MOCK_USER, isActive: false });
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
