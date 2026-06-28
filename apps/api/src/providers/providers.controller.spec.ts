import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

describe('ProvidersController', () => {
  let controller: ProvidersController;

  const mockRequest = { user: { id: 'test-user-id' } };

  const mockService = {
    findAllProviders: jest.fn().mockResolvedValue([]),
    findProviderById: jest.fn().mockResolvedValue({ id: 'test-id' }),
    createProvider: jest.fn().mockResolvedValue({ id: 'new-id' }),
    updateProvider: jest.fn().mockResolvedValue({ id: 'updated-id' }),
    deleteProvider: jest.fn().mockResolvedValue(undefined),
    findApiKeys: jest.fn().mockResolvedValue([]),
    createApiKey: jest.fn().mockResolvedValue({ id: 'key-id', maskedKey: 'sk-***' }),
    deleteApiKey: jest.fn().mockResolvedValue(undefined),
    findModels: jest.fn().mockResolvedValue([]),
    getPresetModels: jest.fn().mockReturnValue([{ name: 'gpt-4o', displayName: 'GPT-4o' }]),
    createModel: jest.fn().mockResolvedValue({ id: 'model-id', name: 'gpt-4o' }),
    updateModel: jest.fn().mockResolvedValue({ id: 'model-id', name: 'gpt-4o-updated' }),
    deleteModel: jest.fn().mockResolvedValue(undefined),
  };

  const mockJwtAuthGuard: CanActivate = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [{ provide: ProvidersService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<ProvidersController>(ProvidersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should return all providers scoped to user', async () => {
    const result = await controller.findAll(mockRequest);
    expect(result).toEqual([]);
    expect(mockService.findAllProviders).toHaveBeenCalledWith('test-user-id');
  });

  it('findOne should return a provider', async () => {
    const result = await controller.findOne('test-id', mockRequest);
    expect(result).toEqual({ id: 'test-id' });
    expect(mockService.findProviderById).toHaveBeenCalledWith('test-id', 'test-user-id');
  });

  it('create should create a provider with userId', async () => {
    const dto: CreateProviderDto = { name: 'OpenAI', type: 'openai' };
    const result = await controller.create(dto, mockRequest);
    expect(result).toEqual({ id: 'new-id' });
    expect(mockService.createProvider).toHaveBeenCalledWith('test-user-id', dto);
  });

  it('update should update a provider', async () => {
    const dto = { name: 'Updated' };
    const result = await controller.update('test-id', dto, mockRequest);
    expect(result).toEqual({ id: 'updated-id' });
    expect(mockService.updateProvider).toHaveBeenCalledWith('test-id', 'test-user-id', dto);
  });

  it('remove should delete a provider', async () => {
    await controller.remove('test-id', mockRequest);
    expect(mockService.deleteProvider).toHaveBeenCalledWith('test-id', 'test-user-id');
  });

  it('findApiKeys should return keys for a provider', async () => {
    const result = await controller.findApiKeys('provider-id', mockRequest);
    expect(result).toEqual([]);
    expect(mockService.findApiKeys).toHaveBeenCalledWith('provider-id', 'test-user-id');
  });

  it('createApiKey should create a key', async () => {
    const dto: CreateApiKeyDto = { name: 'prod', apiKey: 'sk-xxx' };
    const result = await controller.createApiKey('provider-id', dto, mockRequest);
    expect(result).toEqual({ id: 'key-id', maskedKey: 'sk-***' });
    expect(mockService.createApiKey).toHaveBeenCalledWith('provider-id', 'test-user-id', dto);
  });

  it('removeApiKey should delete a key', async () => {
    await controller.removeApiKey('key-id');
    expect(mockService.deleteApiKey).toHaveBeenCalledWith('key-id');
  });

  it('findModels should return models for a provider', async () => {
    const result = await controller.findModels('provider-id', mockRequest);
    expect(result).toEqual([]);
    expect(mockService.findModels).toHaveBeenCalledWith('provider-id', 'test-user-id');
  });

  describe('getPresetModels', () => {
    it('should return preset models by type', () => {
      const result = controller.getPresetModels('openai');
      expect(result).toHaveLength(1);
      expect(mockService.getPresetModels).toHaveBeenCalledWith('openai');
    });
  });

  describe('createModel', () => {
    it('should create a model', async () => {
      const dto: CreateModelDto = { name: 'gpt-4o', displayName: 'GPT-4o' };
      const result = await controller.createModel('provider-id', dto, mockRequest);
      expect(result).toEqual({ id: 'model-id', name: 'gpt-4o' });
      expect(mockService.createModel).toHaveBeenCalledWith('provider-id', 'test-user-id', dto);
    });
  });

  describe('updateModel', () => {
    it('should update a model', async () => {
      const dto = { displayName: 'GPT-4o Updated' };
      const result = await controller.updateModel('model-id', dto);
      expect(result).toEqual({ id: 'model-id', name: 'gpt-4o-updated' });
      expect(mockService.updateModel).toHaveBeenCalledWith('model-id', dto);
    });
  });

  describe('removeModel', () => {
    it('should delete a model scoped to user', async () => {
      await controller.removeModel('model-id', mockRequest);
      expect(mockService.deleteModel).toHaveBeenCalledWith('model-id', 'test-user-id');
    });
  });
});
