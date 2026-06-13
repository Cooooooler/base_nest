import { Exclude } from 'class-transformer';
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

@Entity('api_keys')
export class ApiKey {
  @ApiProperty({ format: 'uuid', description: '密钥唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '关联提供商 ID' })
  @Column()
  providerId: string;

  @ApiProperty({ example: '生产 Key', description: '密钥别名' })
  @Column({ length: 100 })
  name: string;

  @Exclude()
  @Column({ length: 500 })
  encryptedKey: string;

  @ApiProperty({ example: 'sk-****abc', description: '脱敏显示的密钥' })
  @Column({ length: 50 })
  maskedKey: string;

  @ApiProperty({ example: true, description: '是否启用' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => ModelProvider, (provider) => provider.apiKeys)
  @JoinColumn({ name: 'providerId' })
  provider: ModelProvider;
}
