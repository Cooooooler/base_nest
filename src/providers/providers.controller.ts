import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProvidersService } from './providers.service';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @ApiOperation({ summary: '获取所有模型提供商' })
  async findAll() {
    return this.providersService.findAllProviders();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取提供商详情' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.findProviderById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建模型提供商' })
  async create(@Body() dto: CreateProviderDto) {
    return this.providersService.createProvider(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新模型提供商' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProviderDto) {
    return this.providersService.updateProvider(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除模型提供商' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.deleteProvider(id);
  }

  @Get(':id/keys')
  @ApiOperation({ summary: '获取提供商的所有 API 密钥' })
  async findApiKeys(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.findApiKeys(id);
  }

  @Post(':id/keys')
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加 API 密钥' })
  async createApiKey(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateApiKeyDto) {
    return this.providersService.createApiKey(id, dto);
  }

  @Delete('keys/:keyId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除 API 密钥' })
  async removeApiKey(@Param('keyId', ParseUUIDPipe) keyId: string) {
    return this.providersService.deleteApiKey(keyId);
  }

  @Get(':id/models')
  @ApiOperation({ summary: '获取提供商支持的模型列表' })
  async findModels(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.findModels(id);
  }
}
