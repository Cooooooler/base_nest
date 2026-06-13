import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RetrievalQueryDto {
  @ApiProperty({ example: '产品使用方法', description: '查询文本' })
  @IsString()
  query: string;

  @ApiProperty({ example: 4, required: false, description: '返回结果数量' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;
}
