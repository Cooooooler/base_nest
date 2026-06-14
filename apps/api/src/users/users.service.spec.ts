import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    isActive: true,
    createdAt: new Date(),
  };

  const mockFind = jest.fn().mockResolvedValue([mockUser]);
  const mockFindOneBy = jest.fn().mockResolvedValue(mockUser);
  const mockCreate = jest.fn().mockReturnValue(mockUser);
  const mockSave = jest.fn().mockResolvedValue(mockUser);
  const mockDelete = jest.fn().mockResolvedValue({ affected: 1, raw: {} });
  const mockGetOne = jest.fn().mockResolvedValue(mockUser);

  const mockRepository = {
    find: mockFind,
    findOneBy: mockFindOneBy,
    create: mockCreate,
    save: mockSave,
    delete: mockDelete,
    createQueryBuilder: jest.fn(() => ({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: mockGetOne,
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: mockRepository }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockUser]);
      expect(mockFind).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const result = await service.findOne(mockUser.id);
      expect(result).toEqual(mockUser);
      expect(mockFindOneBy).toHaveBeenCalledWith({ id: mockUser.id });
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const result = await service.findByEmail(mockUser.email);
      expect(result).toEqual(mockUser);
      expect(mockFindOneBy).toHaveBeenCalledWith({ email: mockUser.email });
    });
  });

  describe('findByEmailWithPassword', () => {
    it('should return a user with password column', async () => {
      const result = await service.findByEmailWithPassword(mockUser.email);
      expect(result).toEqual(mockUser);
      expect(mockGetOne).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create and return a user', async () => {
      const result = await service.create({
        email: mockUser.email,
        name: mockUser.name,
      });
      expect(result).toEqual(mockUser);
      expect(mockCreate).toHaveBeenCalledWith({
        email: mockUser.email,
        name: mockUser.name,
      });
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      await service.remove(mockUser.id);
      expect(mockDelete).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
