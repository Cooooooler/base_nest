import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { ApiKey } from './api-key.entity';
import { Model } from './model.entity';

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'openai-compatible'
  | 'langchain-ollama';

/** 本地部署的 provider 类型，不需要 API key */
export const LOCAL_PROVIDER_TYPES: ProviderType[] = ['ollama', 'langchain-ollama'];

export function needsApiKey(type: ProviderType): boolean {
  return !LOCAL_PROVIDER_TYPES.includes(type);
}

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

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => ApiKey, (key) => key.provider)
  apiKeys: ApiKey[];

  @OneToMany(() => Model, (model) => model.provider)
  models: Model[];
}
