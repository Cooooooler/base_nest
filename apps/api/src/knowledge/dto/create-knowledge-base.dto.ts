import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @ApiProperty({ example: '产品文档库', description: '知识库名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '包含所有产品文档', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'mxbai-embed-large', required: false, description: '嵌入模型' })
  @IsOptional()
  @IsString()
  embeddingModel?: string;

  @ApiProperty({ example: 500, required: false, description: '分块大小' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  chunkSize?: number;

  @ApiProperty({ example: 50, required: false, description: '分块重叠' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  chunkOverlap?: number;
}
