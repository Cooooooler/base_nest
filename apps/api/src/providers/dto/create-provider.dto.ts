import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProviderDto {
  @ApiProperty({ example: 'OpenAI', description: '提供商名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'openai',
    enum: ['openai', 'anthropic', 'ollama', 'openai-compatible', 'langchain-ollama'],
  })
  @IsEnum(['openai', 'anthropic', 'ollama', 'openai-compatible', 'langchain-ollama'] as const)
  type: 'openai' | 'anthropic' | 'ollama' | 'openai-compatible' | 'langchain-ollama';

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ example: 'https://api.openai.com/v1', required: false })
  @IsOptional()
  @IsString()
  baseUrl?: string;
}
