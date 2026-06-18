import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: '你好', description: '用户消息' })
  @IsString()
  @MinLength(1)
  content: string;
}
