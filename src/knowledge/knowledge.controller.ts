import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { KnowledgeService } from './knowledge.service';
import { RetrievalService } from './retrieval.service';
import { RetrievalQueryDto } from './dto/retrieval-query.dto';

@ApiTags('Knowledge')
@Controller('knowledge')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly retrievalService: RetrievalService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取所有知识库' })
  async findAll(@CurrentUser() user: User) {
    return this.knowledgeService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取知识库详情' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.knowledgeService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: '创建知识库' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateKnowledgeBaseDto,
  ) {
    return this.knowledgeService.create(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除知识库' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.knowledgeService.delete(id);
  }

  @Post(':id/retrieval')
  @ApiOperation({ summary: '检索知识库' })
  async search(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetrievalQueryDto,
  ) {
    return this.retrievalService.search(id, dto.query, dto.topK);
  }
}
