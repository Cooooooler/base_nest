import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppService } from './app.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';

@ApiTags('Chat - Apps')
@Controller('apps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户的所有应用' })
  async findAll(@Req() req: { user: { id: string } }) {
    return this.appService.findAllByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取应用详情' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.appService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建应用' })
  async create(@Req() req: { user: { id: string } }, @Body() dto: CreateAppDto) {
    return this.appService.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新应用' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAppDto) {
    return this.appService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除应用' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.appService.delete(id);
  }
}
