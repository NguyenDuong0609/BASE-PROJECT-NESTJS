import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
	name = 'InitialSchema1700000000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Enable UUID extension
		await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

		// Create enum types
		await queryRunner.query(`
			CREATE TYPE "user_gender_enum" AS ENUM ('Male', 'Female', 'Other')
		`);

		await queryRunner.query(`
			CREATE TYPE "user_languages_enum" AS ENUM ('English', 'French', 'Japanese', 'Korean', 'Spanish')
		`);

		await queryRunner.query(`
			CREATE TYPE "user_auth_provider_enum" AS ENUM ('local', 'google')
		`);

		await queryRunner.query(`
			CREATE TYPE "user_role_enum" AS ENUM ('Admin', 'User')
		`);

		await queryRunner.query(`
			CREATE TYPE "media_file_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed')
		`);

		await queryRunner.query(`
			CREATE TYPE "flash_card_state_enum" AS ENUM ('draft', 'in_review', 'approved_one', 'approved_two', 'published')
		`);

		await queryRunner.query(`
			CREATE TYPE "collection_level_enum" AS ENUM ('easy', 'medium', 'hard', 'chaos')
		`);

		// Create user_roles table
		await queryRunner.query(`
			CREATE TABLE "user_roles" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"name" "user_role_enum" NOT NULL DEFAULT 'User',
				"_description" character varying,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "UQ_user_roles_name" UNIQUE ("name")
			)
		`);

		// Create topics table
		await queryRunner.query(`
			CREATE TABLE "topics" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"name" character varying NOT NULL,
				"description" text,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "UQ_topics_name" UNIQUE ("name")
			)
		`);

		// Create users table
		await queryRunner.query(`
			CREATE TABLE "users" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"friendly_id" integer,
				"first_name" character varying(60) NOT NULL,
				"last_name" character varying(60) NOT NULL,
				"email" character varying NOT NULL,
				"interested_languages" text,
				"phone_number" character varying,
				"username" character varying NOT NULL,
				"password" character varying,
				"googleId" character varying(255),
				"authProvider" "user_auth_provider_enum" NOT NULL DEFAULT 'local',
				"isEmailVerified" boolean NOT NULL DEFAULT false,
				"avatar" character varying DEFAULT 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png',
				"date_of_birth" date,
				"gender" "user_gender_enum",
				"point" integer NOT NULL DEFAULT 0,
				"role_id" uuid NOT NULL,
				"headline" character varying,
				"stripe_customer_id" character varying,
				"current_refresh_token" character varying,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "UQ_users_email" UNIQUE ("email"),
				CONSTRAINT "UQ_users_username" UNIQUE ("username"),
				CONSTRAINT "UQ_users_googleId" UNIQUE ("googleId"),
				CONSTRAINT "FK_users_role" FOREIGN KEY ("role_id") REFERENCES "user_roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
			)
		`);

		// Create addresses table
		await queryRunner.query(`
			CREATE TABLE "addresses" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"street" character varying(120),
				"city" character varying(50) NOT NULL,
				"state" character varying(50) NOT NULL,
				"country" character varying(50) NOT NULL,
				"postal_code" integer,
				"user_id" uuid NOT NULL,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "FK_addresses_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
			)
		`);

		// Create collections table
		await queryRunner.query(`
			CREATE TABLE "collections" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"name" character varying NOT NULL,
				"description" text,
				"level" "collection_level_enum" NOT NULL DEFAULT 'easy',
				"order" integer,
				"image" character varying,
				"total_flash_cards" integer NOT NULL DEFAULT 0,
				"is_public" boolean NOT NULL DEFAULT false,
				"user_id" uuid NOT NULL,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "FK_collections_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
			)
		`);

		// Create flash_cards table
		await queryRunner.query(`
			CREATE TABLE "flash_cards" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"vocabulary" character varying NOT NULL,
				"image" character varying,
				"definition" text NOT NULL,
				"meaning" text NOT NULL,
				"pronunciation" character varying,
				"examples" text,
				"is_public" boolean NOT NULL DEFAULT false,
				"user_id" uuid NOT NULL,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "FK_flash_cards_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
			)
		`);

		// Create flash_cards_topics junction table
		await queryRunner.query(`
			CREATE TABLE "flash_cards_topics" (
				"flash_card_id" uuid NOT NULL,
				"topic_id" uuid NOT NULL,
				CONSTRAINT "PK_flash_cards_topics" PRIMARY KEY ("flash_card_id", "topic_id"),
				CONSTRAINT "FK_flash_cards_topics_flash_card" FOREIGN KEY ("flash_card_id") REFERENCES "flash_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT "FK_flash_cards_topics_topic" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE
			)
		`);

		// Create indexes for junction table
		await queryRunner.query(`
			CREATE INDEX "IDX_flash_cards_topics_flash_card" ON "flash_cards_topics" ("flash_card_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_flash_cards_topics_topic" ON "flash_cards_topics" ("topic_id")
		`);

		// Create flash_cards_state table (for state pattern workflow)
		await queryRunner.query(`
			CREATE TABLE "flash_cards_state" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"title" character varying NOT NULL,
				"question" text NOT NULL,
				"answer" text NOT NULL,
				"state" "flash_card_state_enum" NOT NULL DEFAULT 'draft',
				"created_by" uuid NOT NULL,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "FK_flash_cards_state_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
			)
		`);

		// Create flash_card_transitions table
		await queryRunner.query(`
			CREATE TABLE "flash_card_transitions" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"flash_card_id" uuid NOT NULL,
				"from_state" "flash_card_state_enum" NOT NULL,
				"to_state" "flash_card_state_enum" NOT NULL,
				"comment" text,
				"transitioned_by" uuid NOT NULL,
				"transitioned_at" TIMESTAMP NOT NULL DEFAULT now(),
				CONSTRAINT "FK_flash_card_transitions_flash_card" FOREIGN KEY ("flash_card_id") REFERENCES "flash_cards_state"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
				CONSTRAINT "FK_flash_card_transitions_user" FOREIGN KEY ("transitioned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
			)
		`);

		// Create media_files table
		await queryRunner.query(`
			CREATE TABLE "media_files" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"filename" character varying(255) NOT NULL,
				"s3_key" character varying(255) NOT NULL,
				"mimetype" character varying(100) NOT NULL,
				"size" bigint NOT NULL,
				"url" character varying(512),
				"status" "media_file_status_enum" NOT NULL DEFAULT 'pending',
				"bucket" character varying(50) NOT NULL,
				"uploaded_by" uuid NOT NULL,
				"metadata" jsonb,
				"uploaded_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "UQ_media_files_s3_key" UNIQUE ("s3_key"),
				CONSTRAINT "FK_media_files_uploader" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
			)
		`);

		// Create indexes for media_files
		await queryRunner.query(`
			CREATE INDEX "IDX_media_files_uploaded_by" ON "media_files" ("uploaded_by")
		`);

		// Create comments table
		await queryRunner.query(`
			CREATE TABLE "comments" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"content" text NOT NULL,
				"depth" integer NOT NULL DEFAULT 0,
				"post_id" character varying NOT NULL,
				"likes_count" integer NOT NULL DEFAULT 0,
				"author_id" uuid NOT NULL,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "FK_comments_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
			)
		`);

		// Create comment_closures table (for hierarchical comment structure)
		await queryRunner.query(`
			CREATE TABLE "comment_closures" (
				"ancestor_id" uuid NOT NULL,
				"descendant_id" uuid NOT NULL,
				"depth" integer NOT NULL,
				CONSTRAINT "PK_comment_closures" PRIMARY KEY ("ancestor_id", "descendant_id"),
				CONSTRAINT "FK_comment_closures_ancestor" FOREIGN KEY ("ancestor_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
				CONSTRAINT "FK_comment_closures_descendant" FOREIGN KEY ("descendant_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
			)
		`);

		// Create indexes for comment_closures
		await queryRunner.query(`
			CREATE UNIQUE INDEX "IDX_comment_closures_ancestor_descendant" ON "comment_closures" ("ancestor_id", "descendant_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_comment_closures_descendant" ON "comment_closures" ("descendant_id")
		`);

		// Create checkins table
		await queryRunner.query(`
			CREATE TABLE "checkins" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"user_id" uuid NOT NULL,
				"checkin_date" date NOT NULL,
				"streak_count" integer NOT NULL DEFAULT 1,
				"rewards_earned" integer NOT NULL DEFAULT 0,
				"metadata" jsonb,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				CONSTRAINT "FK_checkins_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
			)
		`);

		// Create unique index for user_id + checkin_date
		await queryRunner.query(`
			CREATE UNIQUE INDEX "IDX_checkins_user_date" ON "checkins" ("user_id", "checkin_date")
		`);

		// Create checkin_stats table
		await queryRunner.query(`
			CREATE TABLE "checkin_stats" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"user_id" uuid NOT NULL,
				"total_checkins" integer NOT NULL DEFAULT 0,
				"current_streak" integer NOT NULL DEFAULT 0,
				"longest_streak" integer NOT NULL DEFAULT 0,
				"total_rewards" integer NOT NULL DEFAULT 0,
				"last_checkin_date" date,
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				CONSTRAINT "UQ_checkin_stats_user" UNIQUE ("user_id"),
				CONSTRAINT "FK_checkin_stats_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
			)
		`);

		// Insert default roles
		await queryRunner.query(`
			INSERT INTO "user_roles" ("name", "_description") VALUES
			('Admin', 'Administrator with full system access'),
			('User', 'Regular user with standard permissions')
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Drop tables in reverse order to respect foreign key constraints
		await queryRunner.query(`DROP TABLE IF EXISTS "checkin_stats" CASCADE`);
		await queryRunner.query(`DROP TABLE IF EXISTS "checkins" CASCADE`);
		await queryRunner.query(`DROP TABLE IF EXISTS "comment_closures" CASCADE`);
		await queryRunner.query(`DROP TABLE IF EXISTS "comments" CASCADE`);
		await queryRunner.query(`DROP TABLE IF EXISTS "media_files" CASCADE`);
		await queryRunner.query(
			`DROP TABLE IF EXISTS "flash_card_transitions" CASCADE`,
		);
		await queryRunner.query(`DROP TABLE IF EXISTS "flash_cards_state" CASCADE`);
		await queryRunner.query(
			`DROP TABLE IF EXISTS "flash_cards_topics" CASCADE`,
		);
		await queryRunner.query(`DROP TABLE IF EXISTS "flash_cards" CASCADE`);
		await queryRunner.query(`DROP TABLE IF EXISTS "collections" CASCADE`);
		await queryRunner.query(`DROP TABLE IF EXISTS "addresses" CASCADE`);
		await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
		await queryRunner.query(`DROP TABLE IF EXISTS "topics" CASCADE`);
		await queryRunner.query(`DROP TABLE IF EXISTS "user_roles" CASCADE`);

		// Drop enum types
		await queryRunner.query(`DROP TYPE IF EXISTS "collection_level_enum"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "flash_card_state_enum"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "media_file_status_enum"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "user_auth_provider_enum"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "user_languages_enum"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "user_gender_enum"`);

		// Drop extension
		await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
	}
}
