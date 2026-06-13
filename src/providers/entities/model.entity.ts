import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ModelProvider } from './model-provider.entity';

@Entity('models')
export class Model {
  @ApiProperty({ format: 'uuid', description: '模型唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '关联提供商 ID' })
  @Column()
  providerId: string;

  @ApiProperty({ example: 'gpt-4o', description: '模型标识名' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ example: 'GPT-4o', description: '模型展示名' })
  @Column({ length: 200 })
  displayName: string;

  @ApiProperty({ example: 128000, description: '上下文窗口大小' })
  @Column({ default: 0 })
  contextWindow: number;

  @ApiProperty({ example: 4096, description: '最大输出长度' })
  @Column({ default: 0 })
  maxOutput: number;

  @ApiProperty({
    example: { streaming: true, functionCalling: true, vision: true },
    description: '模型能力',
  })
  @Column({ type: 'jsonb', default: {} })
  capabilities: Record<string, boolean>;

  @ApiProperty({ example: true, description: '是否预定义模型' })
  @Column({ default: false })
  isBuiltin: boolean;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => ModelProvider, (provider) => provider.models)
  @JoinColumn({ name: 'providerId' })
  provider: ModelProvider;
}
