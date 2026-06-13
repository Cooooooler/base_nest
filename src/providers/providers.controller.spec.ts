import { Test, TestingModule } from '@nestjs/testing';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

describe('ProvidersController', () => {
  let controller: ProvidersController;

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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [{ provide: ProvidersService, useValue: mockService }],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should return all providers', async () => {
    const result = await controller.findAll();
    expect(result).toEqual([]);
    expect(mockService.findAllProviders).toHaveBeenCalled();
  });

  it('findOne should return a provider', async () => {
    const result = await controller.findOne('test-id');
    expect(result).toEqual({ id: 'test-id' });
    expect(mockService.findProviderById).toHaveBeenCalledWith('test-id');
  });

  it('create should create a provider', async () => {
    const dto: CreateProviderDto = { name: 'OpenAI', type: 'openai' };
    const result = await controller.create(dto);
    expect(result).toEqual({ id: 'new-id' });
    expect(mockService.createProvider).toHaveBeenCalledWith(dto);
  });

  it('update should update a provider', async () => {
    const dto = { name: 'Updated' };
    const result = await controller.update('test-id', dto);
    expect(result).toEqual({ id: 'updated-id' });
    expect(mockService.updateProvider).toHaveBeenCalledWith('test-id', dto);
  });

  it('remove should delete a provider', async () => {
    await controller.remove('test-id');
    expect(mockService.deleteProvider).toHaveBeenCalledWith('test-id');
  });

  it('findApiKeys should return keys for a provider', async () => {
    const result = await controller.findApiKeys('provider-id');
    expect(result).toEqual([]);
    expect(mockService.findApiKeys).toHaveBeenCalledWith('provider-id');
  });

  it('createApiKey should create a key', async () => {
    const dto: CreateApiKeyDto = { name: 'prod', apiKey: 'sk-xxx' };
    const result = await controller.createApiKey('provider-id', dto);
    expect(result).toEqual({ id: 'key-id', maskedKey: 'sk-***' });
    expect(mockService.createApiKey).toHaveBeenCalledWith('provider-id', dto);
  });

  it('removeApiKey should delete a key', async () => {
    await controller.removeApiKey('key-id');
    expect(mockService.deleteApiKey).toHaveBeenCalledWith('key-id');
  });

  it('findModels should return models for a provider', async () => {
    const result = await controller.findModels('provider-id');
    expect(result).toEqual([]);
    expect(mockService.findModels).toHaveBeenCalledWith('provider-id');
  });
});
