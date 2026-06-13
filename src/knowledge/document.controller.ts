import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentService } from './document.service';

@ApiTags('Knowledge - Documents')
@Controller('knowledge/:knowledgeBaseId/documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  @ApiOperation({ summary: '获取知识库的所有文档' })
  async findAll(@Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: string) {
    return this.documentService.findByKnowledgeBase(knowledgeBaseId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文档详情（含分段）' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.findById(id);
  }

  @Get(':id/segments')
  @ApiOperation({ summary: '获取文档分段列表' })
  async getSegments(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.getSegments(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: '上传文档' })
  async upload(
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.documentService.upload(knowledgeBaseId, file.originalname, file.buffer);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文档' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.delete(id);
  }
}
