import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TokenBlacklistService } from '../token-blacklist.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const mockBlacklistService = {
    isBlacklisted: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [JwtAuthGuard, { provide: TokenBlacklistService, useValue: mockBlacklistService }],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const createMockContext = (authHeader?: string): ExecutionContext => {
      const request = {
        headers: authHeader ? { authorization: authHeader } : {},
      };
      return {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;
    };

    it('should return true if token is valid and not blacklisted', async () => {
      // Override canActivate to call super method with spied result
      // Use Object.getPrototypeOf to simulate what AuthGuard('jwt') does
      const ctx = createMockContext('Bearer valid-token');
      mockBlacklistService.isBlacklisted.mockResolvedValue(false);

      // We need to mock the parent's canActivate. Since AuthGuard.canActivate
      // returns a Promise, we mock via prototype
      const originalCanActivate = JwtAuthGuard.prototype.__proto__.canActivate;
      JwtAuthGuard.prototype.__proto__.canActivate = jest.fn().mockResolvedValue(true);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockBlacklistService.isBlacklisted).toHaveBeenCalledWith('valid-token');

      // Restore
      JwtAuthGuard.prototype.__proto__.canActivate = originalCanActivate;
    });

    it('should throw UnauthorizedException if token is blacklisted', async () => {
      const ctx = createMockContext('Bearer blacklisted-token');
      mockBlacklistService.isBlacklisted.mockResolvedValue(true);

      const originalCanActivate = JwtAuthGuard.prototype.__proto__.canActivate;
      JwtAuthGuard.prototype.__proto__.canActivate = jest.fn().mockResolvedValue(true);

      await expect(guard.canActivate(ctx)).rejects.toThrow('Token has been revoked');

      JwtAuthGuard.prototype.__proto__.canActivate = originalCanActivate;
    });

    it('should return false if base guard fails', async () => {
      const ctx = createMockContext();
      const originalCanActivate = JwtAuthGuard.prototype.__proto__.canActivate;
      JwtAuthGuard.prototype.__proto__.canActivate = jest.fn().mockResolvedValue(false);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
      expect(mockBlacklistService.isBlacklisted).not.toHaveBeenCalled();

      JwtAuthGuard.prototype.__proto__.canActivate = originalCanActivate;
    });
  });
});
