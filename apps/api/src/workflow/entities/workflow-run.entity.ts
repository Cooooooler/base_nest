import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type WorkflowRunStatus = 'running' | 'succeeded' | 'failed' | 'cancelled';
export type WorkflowTrigger = 'api' | 'manual';

@Entity('workflow_runs')
export class WorkflowRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @Column({ length: 20 })
  status: WorkflowRunStatus;

  @Column('jsonb')
  inputs: Record<string, any>;

  @Column('jsonb', { nullable: true })
  outputs: Record<string, any> | null;

  @Column({ length: 20 })
  triggeredBy: WorkflowTrigger;

  @Column('text', { nullable: true })
  error: string | null;

  @Column('timestamptz')
  startedAt: Date;

  @Column('timestamptz', { nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
