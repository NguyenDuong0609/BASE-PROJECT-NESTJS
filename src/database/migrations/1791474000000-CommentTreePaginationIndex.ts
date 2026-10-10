import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommentTreePaginationIndex1791474000000 implements MigrationInterface {
	name = 'CommentTreePaginationIndex1791474000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'CREATE INDEX "IDX_comments_post_depth_created_at" ON "comments" ("post_id", "depth", "created_at")',
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('DROP INDEX "IDX_comments_post_depth_created_at"');
	}
}
