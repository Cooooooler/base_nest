import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CreateAppDto } from './dto/create-app.dto';

describe('AppController', () => {
  let controller: AppController;

  const mockService = {
    findAllByUser: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'app-1' }),
    create: jest.fn().mockResolvedValue({ id: 'app-1' }),
    update: jest.fn().mockResolvedValue({ id: 'app-1' }),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockJwtAuthGuard: CanActivate = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should return apps', async () => {
    const req = { user: { id: 'user-1' } };
    const result = await controller.findAll(req as any);
    expect(result).toEqual([]);
    expect(mockService.findAllByUser).toHaveBeenCalledWith('user-1');
  });

  it('findOne should return an app', async () => {
    const result = await controller.findOne('app-1');
    expect(result).toEqual({ id: 'app-1' });
  });

  it('create should create an app', async () => {
    const dto: CreateAppDto = {
      name: 'Test',
      providerId: 'prov-1',
      modelId: 'model-1',
    };
    const req = { user: { id: 'user-1' } };
    const result = await controller.create(req as any, dto);
    expect(result).toEqual({ id: 'app-1' });
    expect(mockService.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('update should update an app', async () => {
    const result = await controller.update('app-1', { name: 'Updated' });
    expect(result).toEqual({ id: 'app-1' });
  });

  it('delete should remove an app', async () => {
    await controller.delete('app-1');
    expect(mockService.delete).toHaveBeenCalledWith('app-1');
  });
});
