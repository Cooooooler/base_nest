import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1782583023492 implements MigrationInterface {
  name = 'Migration1782583023492';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "apps" DROP CONSTRAINT "FK_6fa8a6c8b706534409d47a71e99"`);
    await queryRunner.query(`ALTER TABLE "apps" ALTER COLUMN "temperature" SET DEFAULT '0.7'`);
    await queryRunner.query(`ALTER TABLE "apps" DROP COLUMN "knowledgeBaseId"`);
    await queryRunner.query(`ALTER TABLE "apps" ADD "knowledgeBaseId" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "apps" DROP COLUMN "knowledgeBaseId"`);
    await queryRunner.query(`ALTER TABLE "apps" ADD "knowledgeBaseId" uuid`);
    await queryRunner.query(`ALTER TABLE "apps" ALTER COLUMN "temperature" SET DEFAULT 0.7`);
    await queryRunner.query(
      `ALTER TABLE "apps" ADD CONSTRAINT "FK_6fa8a6c8b706534409d47a71e99" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
