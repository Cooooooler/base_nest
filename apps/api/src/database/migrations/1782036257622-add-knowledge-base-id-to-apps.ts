import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class Migrations1782036257622 implements MigrationInterface {
  name = 'Migrations1782036257622';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'apps',
      new TableColumn({
        name: 'knowledgeBaseId',
        type: 'uuid',
        isNullable: true,
      })
    );

    await queryRunner.createForeignKey(
      'apps',
      new TableForeignKey({
        columnNames: ['knowledgeBaseId'],
        referencedTableName: 'knowledge_bases',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('apps');
    const foreignKey = table!.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('knowledgeBaseId') !== -1
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('apps', foreignKey);
    }
    await queryRunner.dropColumn('apps', 'knowledgeBaseId');
  }
}
