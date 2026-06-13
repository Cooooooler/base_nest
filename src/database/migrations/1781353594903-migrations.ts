import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1781353594903 implements MigrationInterface {
    name = 'Migrations1781353594903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "knowledge_bases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "description" text, "embeddingModel" character varying(100) NOT NULL DEFAULT 'mxbai-embed-large', "chunkStrategy" character varying(50) NOT NULL DEFAULT 'recursive', "chunkSize" integer NOT NULL DEFAULT '500', "chunkOverlap" integer NOT NULL DEFAULT '50', "userId" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b7da0ee578e15ebb6213465440d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "knowledgeBaseId" uuid NOT NULL, "fileName" character varying(500) NOT NULL, "fileType" character varying(20) NOT NULL, "fileSize" integer NOT NULL DEFAULT '0', "storagePath" character varying(1000) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "errorMessage" text, "charCount" integer NOT NULL DEFAULT '0', "tokenCount" integer, "processedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "document_segments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "documentId" uuid NOT NULL, "knowledgeBaseId" character varying NOT NULL, "index" integer NOT NULL, "content" text NOT NULL, "charCount" integer NOT NULL DEFAULT '0', "tokenCount" integer, "metadata" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_dd916ea1f6baa18bcbc861eb173" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_2cb9462c87c823404b13692946a" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_segments" ADD CONSTRAINT "FK_9371629195a4f9542e574b5b76a" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document_segments" DROP CONSTRAINT "FK_9371629195a4f9542e574b5b76a"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_2cb9462c87c823404b13692946a"`);
        await queryRunner.query(`DROP TABLE "document_segments"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TABLE "knowledge_bases"`);
    }

}
