import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat - Messages')
@Controller('apps/:appId/conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':convId/messages')
  @ApiOperation({ summary: '获取会话历史消息' })
  async getMessages(
    @Param('appId', ParseUUIDPipe) _appId: string,
    @Param('convId', ParseUUIDPipe) convId: string
  ) {
    return this.chatService.getMessages(convId);
  }

  @Post(':convId/messages')
  @HttpCode(200)
  @ApiOperation({ summary: '发送消息（SSE 流式返回）' })
  async sendMessage(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Param('convId', ParseUUIDPipe) convId: string,
    @Body() dto: SendMessageDto,
    @Req() req: { user: { id: string } },
    @Res() res: Response
  ) {
    // 先执行验证（可能抛出异常），再设置 SSE headers
    const observable = await this.chatService.sendMessage(appId, convId, dto.content, req.user.id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    observable.subscribe({
      next: (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      },
      error: () => {
        res.end();
      },
      complete: () => {
        res.end();
      },
    });
  }
}
