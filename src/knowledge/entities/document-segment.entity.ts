import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('document_segments')
export class DocumentSegment {
  @ApiProperty({ format: 'uuid', description: '分段唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  documentId: string;

  @Column()
  knowledgeBaseId: string;

  @ApiProperty({ example: 0, description: '分段序号' })
  @Column()
  index: number;

  @ApiProperty({ example: '这是文档内容...', description: '分段内容' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ example: 500, description: '字符数' })
  @Column({ default: 0 })
  charCount: number;

  @ApiProperty({ example: 120, description: 'Token 数' })
  @Column({ type: 'integer', nullable: true })
  tokenCount: number | null;

  @ApiProperty({ example: { page: 1 }, description: '元数据' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Document, (doc) => doc.segments)
  @JoinColumn({ name: 'documentId' })
  document: Document;
}
