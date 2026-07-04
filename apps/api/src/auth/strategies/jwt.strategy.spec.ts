import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockUsersService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret') } },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const mockPayload = { sub: 'user-1', email: 'test@example.com', type: 'access' };
    const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test' };

    it('should return user if payload is valid', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual(mockUser);
    });

    it('should throw if token type is not access', async () => {
      await expect(strategy.validate({ ...mockPayload, type: 'refresh' })).rejects.toThrow(
        new UnauthorizedException('Invalid token type')
      );
      expect(mockUsersService.findOne).not.toHaveBeenCalled();
    });

    it('should throw if user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('User not found')
      );
    });
  });
});
