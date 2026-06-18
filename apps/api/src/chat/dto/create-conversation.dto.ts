import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ required: false, description: '会话标题' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
