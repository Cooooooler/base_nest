import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type NodeExecutionStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

@Entity('workflow_node_executions')
export class WorkflowNodeExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  runId: string;

  @Column({ length: 255 })
  nodeId: string;

  @Column({ length: 50 })
  nodeType: string;

  @Column({ length: 20 })
  status: NodeExecutionStatus;

  @Column('jsonb', { nullable: true })
  inputs: Record<string, any> | null;

  @Column('jsonb', { nullable: true })
  outputs: Record<string, any> | null;

  @Column('int', { nullable: true })
  latency: number | null;

  @Column('text', { nullable: true })
  error: string | null;

  @Column('timestamptz', { nullable: true })
  startedAt: Date | null;

  @Column('timestamptz', { nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
