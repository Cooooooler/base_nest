import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BlacklistedToken } from '../auth/entities/blacklisted-token.entity';
import { TokenBlacklistService } from '../auth/token-blacklist.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;

  const mockRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
  };

  const mockInsertBuilder = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockInsertBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        { provide: getRepositoryToken(BlacklistedToken), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToBlacklist', () => {
    it('should hash the token and insert with orIgnore', async () => {
      const token = 'some-jwt-token';
      const expiresAt = new Date('2099-01-01');
      mockInsertBuilder.execute.mockResolvedValue(undefined);

      await service.addToBlacklist(token, expiresAt);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockInsertBuilder.insert).toHaveBeenCalled();
      expect(mockInsertBuilder.values).toHaveBeenCalledWith({
        tokenHash: expect.any(String),
        expiresAt,
      });
      // Verify the hash is SHA-256 hex (64 chars)
      const valuesCall = mockInsertBuilder.values.mock.calls[0][0];
      expect(valuesCall.tokenHash).toHaveLength(64);
      expect(valuesCall.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(mockInsertBuilder.orIgnore).toHaveBeenCalled();
      expect(mockInsertBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('isBlacklisted', () => {
    it('should return true if token is blacklisted', async () => {
      mockRepo.count.mockResolvedValue(1);

      const result = await service.isBlacklisted('some-token');

      expect(result).toBe(true);
      expect(mockRepo.count).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
    });

    it('should return false if token is not blacklisted', async () => {
      mockRepo.count.mockResolvedValue(0);

      const result = await service.isBlacklisted('some-token');

      expect(result).toBe(false);
    });
  });

  describe('removeExpired', () => {
    it('should delete tokens with expiresAt <= now', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 5, raw: {} });

      await service.removeExpired();

      expect(mockRepo.delete).toHaveBeenCalledWith({
        expiresAt: expect.any(Object),
      });
    });
  });
});
