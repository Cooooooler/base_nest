import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1781351146835 implements MigrationInterface {
    name = 'Migrations1781351146835'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "models" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerId" uuid NOT NULL, "name" character varying(100) NOT NULL, "displayName" character varying(200) NOT NULL, "contextWindow" integer NOT NULL DEFAULT '0', "maxOutput" integer NOT NULL DEFAULT '0', "capabilities" jsonb NOT NULL DEFAULT '{}', "isBuiltin" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ef9ed7160ea69013636466bf2d5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "model_providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "type" character varying(50) NOT NULL, "isEnabled" boolean NOT NULL DEFAULT true, "baseUrl" character varying(500), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5620fd1368e2e8c95bc1a6c3337" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerId" uuid NOT NULL, "name" character varying(100) NOT NULL, "encryptedKey" character varying(500) NOT NULL, "maskedKey" character varying(50) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "models" ADD CONSTRAINT "FK_2ce64b8d909a4385f26bcd363b3" FOREIGN KEY ("providerId") REFERENCES "model_providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "api_keys" ADD CONSTRAINT "FK_89037ffc2f5e884206d91a4a88c" FOREIGN KEY ("providerId") REFERENCES "model_providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "api_keys" DROP CONSTRAINT "FK_89037ffc2f5e884206d91a4a88c"`);
        await queryRunner.query(`ALTER TABLE "models" DROP CONSTRAINT "FK_2ce64b8d909a4385f26bcd363b3"`);
        await queryRunner.query(`DROP TABLE "api_keys"`);
        await queryRunner.query(`DROP TABLE "model_providers"`);
        await queryRunner.query(`DROP TABLE "models"`);
    }

}
