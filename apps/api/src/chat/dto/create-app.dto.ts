import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAppDto {
  @ApiProperty({ example: '智能客服', description: '应用名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ModelProvider ID' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: 'Model ID' })
  @IsUUID()
  modelId: string;

  @ApiProperty({ required: false, description: '系统提示词' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiProperty({ required: false, default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiProperty({ required: false, default: 4096 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(128000)
  maxTokens?: number;

  @ApiProperty({ required: false, description: '关联知识库 ID' })
  @IsOptional()
  @IsUUID()
  knowledgeBaseId?: string;
}
