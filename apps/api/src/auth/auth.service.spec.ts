import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { TokenBlacklistService } from './token-blacklist.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    isActive: true,
    createdAt: new Date(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockBlacklistService = {
    addToBlacklist: jest.fn(),
    isBlacklisted: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockUserRepo = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TokenBlacklistService, useValue: mockBlacklistService },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = { email: 'test@example.com', name: 'Test User', password: 'password123' };

    it('should register a new user and return tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.register(registerDto);

      expect(result).toEqual({
        user: { id: mockUser.id, email: mockUser.email, name: mockUser.name },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction on DB error', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB error'));

      await expect(service.register(registerDto)).rejects.toThrow('DB error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should login successfully and return tokens', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      jest.mocked(bcrypt.compare).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: { id: mockUser.id, email: mockUser.email, name: mockUser.name },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      jest.mocked(bcrypt.compare).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const refreshToken = 'valid-refresh-token';
    const payload = { sub: mockUser.id, email: mockUser.email, type: 'refresh', exp: 9999999999 };
    const newTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

    beforeEach(() => {
      mockConfigService.get.mockReturnValue('secret');
    });

    it('should refresh tokens successfully', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockBlacklistService.addToBlacklist.mockResolvedValue(undefined);
      mockJwtService.signAsync
        .mockResolvedValueOnce(newTokens.accessToken)
        .mockResolvedValueOnce(newTokens.refreshToken);

      const result = await service.refresh(refreshToken);

      expect(result).toEqual(newTokens);
      expect(mockBlacklistService.addToBlacklist).toHaveBeenCalledWith(
        refreshToken,
        expect.any(Date)
      );
    });

    it('should throw UnauthorizedException if token type is not refresh', async () => {
      mockJwtService.verify.mockReturnValue({ ...payload, type: 'access' });

      await expect(service.refresh(refreshToken)).rejects.toThrow('Invalid token type');
    });

    it('should throw UnauthorizedException if token is blacklisted', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockBlacklistService.isBlacklisted.mockResolvedValue(true);

      await expect(service.refresh(refreshToken)).rejects.toThrow('Token has been revoked');
    });

    it('should throw UnauthorizedException if token is expired/invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should re-throw UnauthorizedException from verify', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new UnauthorizedException('custom');
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow('custom');
    });
  });

  describe('logout', () => {
    const accessToken = 'access-token';
    const refreshToken = 'refresh-token';

    it('should blacklist both access and refresh tokens', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockJwtService.decode
        .mockReturnValueOnce({ exp: now + 3600 })
        .mockReturnValueOnce({ exp: now + 86400 });

      await service.logout(accessToken, refreshToken);

      expect(mockBlacklistService.addToBlacklist).toHaveBeenCalledTimes(2);
    });

    it('should blacklist only access token when no refresh token', async () => {
      mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      await service.logout(accessToken);

      expect(mockBlacklistService.addToBlacklist).toHaveBeenCalledTimes(1);
    });

    it('should handle decode errors gracefully', async () => {
      mockJwtService.decode.mockImplementation(() => {
        throw new Error('decode error');
      });

      await expect(service.logout(accessToken, refreshToken)).resolves.not.toThrow();
    });

    it('should skip blacklisting when token has no exp', async () => {
      mockJwtService.decode.mockReturnValue({ sub: 'user-1' });

      await service.logout(accessToken);

      expect(mockBlacklistService.addToBlacklist).not.toHaveBeenCalled();
    });
  });

  describe('token generation', () => {
    beforeEach(() => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      jest.mocked(bcrypt.compare).mockResolvedValue(true);
    });

    it('should generate access and refresh tokens with correct payloads', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'JWT_SECRET') return 'secret';
        if (key === 'JWT_ACCESS_EXPIRES') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES') return '7d';
        return defaultVal;
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        email: mockUser.email,
        password: 'password',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      // Verify that signAsync was called with correct payloads
      const accessCall = mockJwtService.signAsync.mock.calls[0];
      expect(accessCall[0]).toMatchObject({
        sub: mockUser.id,
        email: mockUser.email,
        type: 'access',
      });
      const refreshCall = mockJwtService.signAsync.mock.calls[1];
      expect(refreshCall[0]).toMatchObject({
        sub: mockUser.id,
        email: mockUser.email,
        type: 'refresh',
      });
      expect(refreshCall[0]).toHaveProperty('jti');
    });

    it('should use defaults when config values are undefined', async () => {
      // Simulate config returning undefined
      mockConfigService.get.mockReturnValue(undefined);
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      jest.mocked(bcrypt.compare).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        email: mockUser.email,
        password: 'password',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });
  });
});
