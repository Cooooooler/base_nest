import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

describe('ConversationController', () => {
  let controller: ConversationController;

  const mockService = {
    findByApp: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'conv-1' }),
    create: jest.fn().mockResolvedValue({ id: 'conv-1' }),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockJwtAuthGuard: CanActivate = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [{ provide: ConversationService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<ConversationController>(ConversationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should return conversations', async () => {
    const req = { user: { id: 'user-1' } };
    const result = await controller.findAll(req as any, 'app-1');
    expect(result).toEqual([]);
    expect(mockService.findByApp).toHaveBeenCalledWith('app-1', 'user-1');
  });

  it('create should create a conversation', async () => {
    const req = { user: { id: 'user-1' } };
    const dto: CreateConversationDto = { title: 'Test' };
    const result = await controller.create(req as any, 'app-1', dto);
    expect(result).toEqual({ id: 'conv-1' });
  });

  it('delete should remove a conversation', async () => {
    await controller.delete('app-1', 'conv-1');
    expect(mockService.delete).toHaveBeenCalledWith('conv-1');
  });
});
