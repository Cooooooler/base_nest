import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('knowledge_bases')
export class KnowledgeBase {
  @ApiProperty({ format: 'uuid', description: '知识库唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '产品文档库', description: '知识库名称' })
  @Column({ length: 200 })
  name: string;

  @ApiProperty({
    example: '包含所有产品相关文档',
    description: '知识库描述',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: 'mxbai-embed-large',
    description: '嵌入模型名称',
  })
  @Column({ length: 100, default: 'mxbai-embed-large' })
  embeddingModel: string;

  @ApiProperty({ example: 'recursive', description: '分块策略' })
  @Column({ length: 50, default: 'recursive' })
  chunkStrategy: string;

  @ApiProperty({ example: 500, description: '分块大小（字符数）' })
  @Column({ default: 500 })
  chunkSize: number;

  @ApiProperty({ example: 50, description: '分块重叠（字符数）' })
  @Column({ default: 50 })
  chunkOverlap: number;

  @Column()
  userId: string;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Document, (doc) => doc.knowledgeBase)
  documents: Document[];
}
