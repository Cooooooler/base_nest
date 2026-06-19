import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateModelDto {
  @ApiProperty({ example: 'gpt-4o', description: '模型标识名' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'GPT-4o', description: '模型展示名' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName: string;

  @ApiProperty({ example: 128000, description: '上下文窗口大小', required: false })
  @IsOptional()
  @IsNumber()
  contextWindow?: number;

  @ApiProperty({ example: 4096, description: '最大输出长度', required: false })
  @IsOptional()
  @IsNumber()
  maxOutput?: number;

  @ApiProperty({
    example: { streaming: true, functionCalling: true, vision: true },
    description: '模型能力',
    required: false,
  })
  @IsOptional()
  @IsObject()
  capabilities?: Record<string, boolean>;
}
