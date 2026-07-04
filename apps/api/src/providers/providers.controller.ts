import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProvidersService } from './providers.service';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户的所有模型提供商' })
  async findAll(@Req() req: { user: { id: string } }) {
    return this.providersService.findAllProviders(req.user.id);
  }

  @Get('preset-models')
  @ApiOperation({ summary: '获取预设模型列表' })
  getPresetModels(@Query('type') type: string) {
    return this.providersService.getPresetModels(type);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取提供商详情' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user: { id: string } }) {
    return this.providersService.findProviderById(id, req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建模型提供商' })
  async create(@Body() dto: CreateProviderDto, @Req() req: { user: { id: string } }) {
    return this.providersService.createProvider(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新模型提供商' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderDto,
    @Req() req: { user: { id: string } }
  ) {
    return this.providersService.updateProvider(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除模型提供商' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user: { id: string } }) {
    return this.providersService.deleteProvider(id, req.user.id);
  }

  @Get(':id/keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取提供商的所有 API 密钥' })
  async findApiKeys(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user: { id: string } }) {
    return this.providersService.findApiKeys(id, req.user.id);
  }

  @Post(':id/keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加 API 密钥' })
  async createApiKey(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateApiKeyDto,
    @Req() req: { user: { id: string } }
  ) {
    return this.providersService.createApiKey(id, req.user.id, dto);
  }

  @Delete('keys/:keyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除 API 密钥' })
  async removeApiKey(
    @Param('keyId', ParseUUIDPipe) keyId: string,
    @Req() req: { user: { id: string } }
  ) {
    return this.providersService.deleteApiKey(keyId, req.user.id);
  }

  @Post(':id/models')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加模型' })
  async createModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateModelDto,
    @Req() req: { user: { id: string } }
  ) {
    return this.providersService.createModel(id, req.user.id, dto);
  }

  @Patch(':id/models/:modelId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新模型' })
  async updateModel(
    @Param('modelId', ParseUUIDPipe) modelId: string,
    @Body() dto: UpdateModelDto,
    @Req() req: { user: { id: string } }
  ) {
    return this.providersService.updateModel(modelId, dto, req.user.id);
  }

  @Delete(':id/models/:modelId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除模型' })
  async removeModel(
    @Param('modelId', ParseUUIDPipe) modelId: string,
    @Req() req: { user: { id: string } }
  ) {
    return this.providersService.deleteModel(modelId, req.user.id);
  }

  @Get(':id/models')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取提供商支持的模型列表' })
  async findModels(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user: { id: string } }) {
    return this.providersService.findModels(id, req.user.id);
  }
}
