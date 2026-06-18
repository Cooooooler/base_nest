import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ModelProvider } from '../../providers/entities/model-provider.entity';
import { Model } from '../../providers/entities/model.entity';

@Entity('apps')
export class App {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  providerId: string;

  @ManyToOne(() => ModelProvider)
  @JoinColumn({ name: 'providerId' })
  provider: ModelProvider;

  @Column()
  modelId: string;

  @ManyToOne(() => Model)
  @JoinColumn({ name: 'modelId' })
  model: Model;

  @Column('text', { default: '' })
  systemPrompt: string;

  @Column('decimal', { precision: 3, scale: 2, default: 0.7 })
  temperature: number;

  @Column('int', { default: 4096 })
  maxTokens: number;

  @Column()
  userId: string;

  @Column('boolean', { default: false })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
