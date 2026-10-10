import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantId1790954555707 implements MigrationInterface {
	name = 'AddTenantId1790954555707';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "flash_cards" DROP CONSTRAINT "FK_flash_cards_user"`,
		);
		await queryRunner.query(
			`ALTER TABLE "collections" DROP CONSTRAINT "FK_collections_user"`,
		);
		await queryRunner.query(
			`ALTER TABLE "addresses" DROP CONSTRAINT "FK_addresses_user"`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" DROP CONSTRAINT "FK_users_role"`,
		);
		await queryRunner.query(
			`ALTER TABLE "media_files" DROP CONSTRAINT "FK_media_files_uploader"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_state" DROP CONSTRAINT "FK_flash_cards_state_creator"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_card_transitions" DROP CONSTRAINT "FK_flash_card_transitions_flash_card"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_card_transitions" DROP CONSTRAINT "FK_flash_card_transitions_user"`,
		);
		await queryRunner.query(
			`ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_author"`,
		);
		await queryRunner.query(
			`ALTER TABLE "comment_closures" DROP CONSTRAINT "FK_comment_closures_ancestor"`,
		);
		await queryRunner.query(
			`ALTER TABLE "comment_closures" DROP CONSTRAINT "FK_comment_closures_descendant"`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkins" DROP CONSTRAINT "FK_checkins_user"`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkin_stats" DROP CONSTRAINT "FK_checkin_stats_user"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_topics" DROP CONSTRAINT "FK_flash_cards_topics_flash_card"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_topics" DROP CONSTRAINT "FK_flash_cards_topics_topic"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_media_files_uploaded_by"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_comment_closures_ancestor_descendant"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_comment_closures_descendant"`,
		);
		await queryRunner.query(`DROP INDEX "public"."IDX_checkins_user_date"`);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_flash_cards_topics_flash_card"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_flash_cards_topics_topic"`,
		);
		await queryRunner.query(
			`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying, "action" character varying NOT NULL, "resource" character varying NOT NULL, "resourceId" character varying, "oldValue" jsonb, "newValue" jsonb, "ip" character varying, "userAgent" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_5db7a2b9e2bd2563b2377c293c" ON "audit_logs" ("resource", "resourceId") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_99e589da8f9e9326ee0d01a028" ON "audit_logs" ("userId", "createdAt") `,
		);
		await queryRunner.query(
			`ALTER TABLE "user_roles" ADD "tenant_id" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "topics" ADD "tenant_id" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ADD "tenant_id" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "collections" ADD "tenant_id" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "addresses" ADD "tenant_id" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ADD "tenant_id" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ADD "twoFactorAuthenticationSecret" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ADD "isTwoFactorAuthenticationEnabled" boolean NOT NULL DEFAULT false`,
		);
		await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "description"`);
		await queryRunner.query(
			`ALTER TABLE "topics" ADD "description" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ALTER COLUMN "image" SET NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" DROP COLUMN "definition"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ADD "definition" character varying NOT NULL`,
		);
		await queryRunner.query(`ALTER TABLE "flash_cards" DROP COLUMN "meaning"`);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ADD "meaning" character varying NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ALTER COLUMN "user_id" DROP NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "collections" DROP COLUMN "description"`,
		);
		await queryRunner.query(
			`ALTER TABLE "collections" ADD "description" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "collections" ALTER COLUMN "user_id" DROP NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "addresses" ALTER COLUMN "user_id" DROP NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ALTER COLUMN "avatar" SET NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ALTER COLUMN "stripe_customer_id" DROP NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_state" DROP COLUMN "title"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_state" ADD "title" character varying(255) NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkins" ALTER COLUMN "streak_count" DROP DEFAULT`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkins" ALTER COLUMN "rewards_earned" DROP DEFAULT`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_9ba994241aa56453ed8768f2ca" ON "comment_closures" ("descendant_id") `,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_0d998f0702af7fc0d31fc7988b" ON "comment_closures" ("ancestor_id", "descendant_id") `,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_188bf0373895c6fdb8a329b338" ON "checkins" ("user_id", "checkin_date") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_9143fd339849f3941e840ce99c" ON "flash_cards_topics" ("flash_card_id") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_dddab7c3a65784245866f8fe71" ON "flash_cards_topics" ("topic_id") `,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ADD CONSTRAINT "FK_164c391d695977b554f2153fdf8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "collections" ADD CONSTRAINT "FK_728c4a63e823bcd4c687fe46747" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "addresses" ADD CONSTRAINT "FK_16aac8a9f6f9c1dd6bcb75ec023" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "user_roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "media_files" ADD CONSTRAINT "FK_78f2e01705ad1a9b77ef3ee3777" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_state" ADD CONSTRAINT "FK_f4171a2bd6e398a359a450ed17c" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_card_transitions" ADD CONSTRAINT "FK_0d04679e9500558e95bfc066f49" FOREIGN KEY ("flash_card_id") REFERENCES "flash_cards_state"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_card_transitions" ADD CONSTRAINT "FK_470e54e452f7e3253d366482272" FOREIGN KEY ("transitioned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "comments" ADD CONSTRAINT "FK_e6d38899c31997c45d128a8973b" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "comment_closures" ADD CONSTRAINT "FK_ccc6f4e8bd92ff6ca2480381029" FOREIGN KEY ("ancestor_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "comment_closures" ADD CONSTRAINT "FK_9ba994241aa56453ed8768f2ca2" FOREIGN KEY ("descendant_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkins" ADD CONSTRAINT "FK_4bee1e59fa58838948f443e531f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkin_stats" ADD CONSTRAINT "FK_a2ca84b01ff3f858fcfdfcbbd14" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_topics" ADD CONSTRAINT "FK_9143fd339849f3941e840ce99c7" FOREIGN KEY ("flash_card_id") REFERENCES "flash_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_topics" ADD CONSTRAINT "FK_dddab7c3a65784245866f8fe711" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "flash_cards_topics" DROP CONSTRAINT "FK_dddab7c3a65784245866f8fe711"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_topics" DROP CONSTRAINT "FK_9143fd339849f3941e840ce99c7"`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkin_stats" DROP CONSTRAINT "FK_a2ca84b01ff3f858fcfdfcbbd14"`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkins" DROP CONSTRAINT "FK_4bee1e59fa58838948f443e531f"`,
		);
		await queryRunner.query(
			`ALTER TABLE "comment_closures" DROP CONSTRAINT "FK_9ba994241aa56453ed8768f2ca2"`,
		);
		await queryRunner.query(
			`ALTER TABLE "comment_closures" DROP CONSTRAINT "FK_ccc6f4e8bd92ff6ca2480381029"`,
		);
		await queryRunner.query(
			`ALTER TABLE "comments" DROP CONSTRAINT "FK_e6d38899c31997c45d128a8973b"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_card_transitions" DROP CONSTRAINT "FK_470e54e452f7e3253d366482272"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_card_transitions" DROP CONSTRAINT "FK_0d04679e9500558e95bfc066f49"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_state" DROP CONSTRAINT "FK_f4171a2bd6e398a359a450ed17c"`,
		);
		await queryRunner.query(
			`ALTER TABLE "media_files" DROP CONSTRAINT "FK_78f2e01705ad1a9b77ef3ee3777"`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`,
		);
		await queryRunner.query(
			`ALTER TABLE "addresses" DROP CONSTRAINT "FK_16aac8a9f6f9c1dd6bcb75ec023"`,
		);
		await queryRunner.query(
			`ALTER TABLE "collections" DROP CONSTRAINT "FK_728c4a63e823bcd4c687fe46747"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" DROP CONSTRAINT "FK_164c391d695977b554f2153fdf8"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_dddab7c3a65784245866f8fe71"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_9143fd339849f3941e840ce99c"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_188bf0373895c6fdb8a329b338"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_0d998f0702af7fc0d31fc7988b"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_9ba994241aa56453ed8768f2ca"`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkins" ALTER COLUMN "rewards_earned" SET DEFAULT '0'`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkins" ALTER COLUMN "streak_count" SET DEFAULT '1'`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_state" DROP COLUMN "title"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_state" ADD "title" character varying NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ALTER COLUMN "stripe_customer_id" DROP NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ALTER COLUMN "avatar" DROP NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "addresses" ALTER COLUMN "user_id" SET NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "collections" ALTER COLUMN "user_id" SET NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "collections" DROP COLUMN "description"`,
		);
		await queryRunner.query(`ALTER TABLE "collections" ADD "description" text`);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ALTER COLUMN "user_id" SET NOT NULL`,
		);
		await queryRunner.query(`ALTER TABLE "flash_cards" DROP COLUMN "meaning"`);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ADD "meaning" text NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" DROP COLUMN "definition"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ADD "definition" text NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ALTER COLUMN "image" DROP NOT NULL`,
		);
		await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "description"`);
		await queryRunner.query(`ALTER TABLE "topics" ADD "description" text`);
		await queryRunner.query(
			`ALTER TABLE "users" DROP COLUMN "isTwoFactorAuthenticationEnabled"`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" DROP COLUMN "twoFactorAuthenticationSecret"`,
		);
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tenant_id"`);
		await queryRunner.query(`ALTER TABLE "addresses" DROP COLUMN "tenant_id"`);
		await queryRunner.query(
			`ALTER TABLE "collections" DROP COLUMN "tenant_id"`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" DROP COLUMN "tenant_id"`,
		);
		await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "tenant_id"`);
		await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN "tenant_id"`);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_99e589da8f9e9326ee0d01a028"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_5db7a2b9e2bd2563b2377c293c"`,
		);
		await queryRunner.query(`DROP TABLE "audit_logs"`);
		await queryRunner.query(
			`CREATE INDEX "IDX_flash_cards_topics_topic" ON "flash_cards_topics" ("topic_id") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_flash_cards_topics_flash_card" ON "flash_cards_topics" ("flash_card_id") `,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_checkins_user_date" ON "checkins" ("user_id", "checkin_date") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_comment_closures_descendant" ON "comment_closures" ("descendant_id") `,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_comment_closures_ancestor_descendant" ON "comment_closures" ("ancestor_id", "descendant_id") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_media_files_uploaded_by" ON "media_files" ("uploaded_by") `,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_topics" ADD CONSTRAINT "FK_flash_cards_topics_topic" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_topics" ADD CONSTRAINT "FK_flash_cards_topics_flash_card" FOREIGN KEY ("flash_card_id") REFERENCES "flash_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkin_stats" ADD CONSTRAINT "FK_checkin_stats_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "checkins" ADD CONSTRAINT "FK_checkins_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "comment_closures" ADD CONSTRAINT "FK_comment_closures_descendant" FOREIGN KEY ("descendant_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "comment_closures" ADD CONSTRAINT "FK_comment_closures_ancestor" FOREIGN KEY ("ancestor_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_card_transitions" ADD CONSTRAINT "FK_flash_card_transitions_user" FOREIGN KEY ("transitioned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_card_transitions" ADD CONSTRAINT "FK_flash_card_transitions_flash_card" FOREIGN KEY ("flash_card_id") REFERENCES "flash_cards_state"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards_state" ADD CONSTRAINT "FK_flash_cards_state_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "media_files" ADD CONSTRAINT "FK_media_files_uploader" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ADD CONSTRAINT "FK_users_role" FOREIGN KEY ("role_id") REFERENCES "user_roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "addresses" ADD CONSTRAINT "FK_addresses_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "collections" ADD CONSTRAINT "FK_collections_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "flash_cards" ADD CONSTRAINT "FK_flash_cards_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}
}
