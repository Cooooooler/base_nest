import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: '生产 Key', description: '密钥别名' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'sk-proj-xxxxxxxxxxxx', description: 'API 密钥原文' })
  @IsString()
  @MinLength(1)
  apiKey: string;
}
