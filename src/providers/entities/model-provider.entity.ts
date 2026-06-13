import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ApiKey } from './api-key.entity';
import { Model } from './model.entity';

export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'openai-compatible' | 'langchain-ollama';

@Entity('model_providers')
export class ModelProvider {
  @ApiProperty({ format: 'uuid', description: '提供商唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'OpenAI', description: '提供商名称' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({
    example: 'openai',
    description: '提供商类型',
    enum: ['openai', 'anthropic', 'ollama', 'openai-compatible', 'langchain-ollama'],
  })
  @Column({ length: 50 })
  type: ProviderType;

  @ApiProperty({ example: true, description: '是否启用' })
  @Column({ default: true })
  isEnabled: boolean;

  @ApiProperty({ example: 'https://api.openai.com/v1', description: '自定义端点' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  baseUrl: string | null;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ApiKey, (key) => key.provider)
  apiKeys: ApiKey[];

  @OneToMany(() => Model, (model) => model.provider)
  models: Model[];
}
