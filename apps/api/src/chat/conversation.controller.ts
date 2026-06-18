import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@ApiTags('Chat - Conversations')
@Controller('apps/:appId/conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  @ApiOperation({ summary: '获取应用的所有会话' })
  async findAll(
    @Req() req: { user: { id: string } },
    @Param('appId', ParseUUIDPipe) appId: string
  ) {
    return this.conversationService.findByApp(appId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: '创建会话' })
  async create(
    @Req() req: { user: { id: string } },
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: CreateConversationDto
  ) {
    return this.conversationService.create(appId, req.user.id, dto);
  }

  @Delete(':convId')
  @ApiOperation({ summary: '删除会话' })
  async delete(
    @Param('appId', ParseUUIDPipe) _appId: string,
    @Param('convId', ParseUUIDPipe) convId: string
  ) {
    return this.conversationService.delete(convId);
  }
}
