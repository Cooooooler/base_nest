import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowTables1720000000000 implements MigrationInterface {
  name = 'CreateWorkflowTables1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workflows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "graph" jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflows" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workflow_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workflowId" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'running',
        "inputs" jsonb NOT NULL DEFAULT '{}',
        "outputs" jsonb,
        "triggeredBy" character varying(20) NOT NULL DEFAULT 'api',
        "error" text,
        "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_runs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workflow_node_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "runId" uuid NOT NULL,
        "nodeId" character varying(255) NOT NULL,
        "nodeType" character varying(50) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "inputs" jsonb,
        "outputs" jsonb,
        "latency" integer,
        "error" text,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_workflow_node_executions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_runs_workflow" ON "workflow_runs" ("workflowId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_node_executions_run" ON "workflow_node_executions" ("runId")
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
        ADD CONSTRAINT "FK_workflow_runs_workflow"
        FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_node_executions"
        ADD CONSTRAINT "FK_workflow_node_executions_run"
        FOREIGN KEY ("runId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workflow_node_executions"`);
    await queryRunner.query(`DROP TABLE "workflow_runs"`);
    await queryRunner.query(`DROP TABLE "workflows"`);
  }
}
