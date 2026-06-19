import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1781790820593 implements MigrationInterface {
  name = 'Migrations1781790820593';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "apps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "providerId" uuid NOT NULL, "modelId" uuid NOT NULL, "systemPrompt" text NOT NULL DEFAULT '', "temperature" numeric(3,2) NOT NULL DEFAULT '0.7', "maxTokens" integer NOT NULL DEFAULT '4096', "userId" character varying NOT NULL, "isPublished" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c5121fda0f8268f1f7f84134e19" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "appId" uuid NOT NULL, "title" character varying(255), "userId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversationId" uuid NOT NULL, "role" character varying(20) NOT NULL, "content" text NOT NULL, "tokens" jsonb, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "apps" ADD CONSTRAINT "FK_31ec7efc2759db0fa128654d177" FOREIGN KEY ("providerId") REFERENCES "model_providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "apps" ADD CONSTRAINT "FK_5f16fdeabd9341113b0aedbf686" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_cfde95297e0e1de800b23ca96ba" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_cfde95297e0e1de800b23ca96ba"`
    );
    await queryRunner.query(`ALTER TABLE "apps" DROP CONSTRAINT "FK_5f16fdeabd9341113b0aedbf686"`);
    await queryRunner.query(`ALTER TABLE "apps" DROP CONSTRAINT "FK_31ec7efc2759db0fa128654d177"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TABLE "apps"`);
  }
}
