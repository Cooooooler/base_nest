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
      const done = jest.fn();

      await strategy.validate(mockPayload, done);

      expect(done).toHaveBeenCalledWith(null, mockUser);
    });

    it('should call done with error if token type is not access', async () => {
      const done = jest.fn();

      await strategy.validate({ ...mockPayload, type: 'refresh' }, done);

      expect(done).toHaveBeenCalledWith(new UnauthorizedException('Invalid token type'), false);
      expect(mockUsersService.findOne).not.toHaveBeenCalled();
    });

    it('should call done with error if user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);
      const done = jest.fn();

      await strategy.validate(mockPayload, done);

      expect(done).toHaveBeenCalledWith(new UnauthorizedException('User not found'), false);
    });
  });
});
