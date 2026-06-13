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
import { DocumentSegment } from './document-segment.entity';
import { KnowledgeBase } from './knowledge-base.entity';

export type DocumentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

@Entity('documents')
export class Document {
  @ApiProperty({ format: 'uuid', description: '文档唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  knowledgeBaseId: string;

  @ApiProperty({ example: '产品手册.pdf', description: '文件名' })
  @Column({ length: 500 })
  fileName: string;

  @ApiProperty({ example: 'pdf', description: '文件类型' })
  @Column({ length: 20 })
  fileType: string;

  @ApiProperty({ example: 1024000, description: '文件大小（字节）' })
  @Column({ default: 0 })
  fileSize: number;

  @ApiProperty({ description: '文件存储路径' })
  @Column({ length: 1000 })
  storagePath: string;

  @ApiProperty({ example: 'completed', description: '处理状态' })
  @Column({ length: 20, default: 'pending' })
  status: DocumentStatus;

  @ApiProperty({ description: '错误信息', required: false })
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ example: 5000, description: '字符数' })
  @Column({ default: 0 })
  charCount: number;

  @ApiProperty({ example: 1200, description: 'Token 数', required: false })
  @Column({ type: 'integer', nullable: true })
  tokenCount: number | null;

  @ApiProperty({ description: '处理完成时间', required: false })
  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => KnowledgeBase, (kb) => kb.documents)
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: KnowledgeBase;

  @OneToMany(() => DocumentSegment, (seg) => seg.document)
  segments: DocumentSegment[];
}
