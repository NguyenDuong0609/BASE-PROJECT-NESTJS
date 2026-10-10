# Quản lý Module Nghiệp Vụ

Hướng dẫn thêm, bật/tắt và xóa module nghiệp vụ (Blog, E-commerce, v.v.).

## Tổng quan

Dự án chia module thành 2 loại:

1. **Core Modules** (Bắt buộc) - Auth, Users, UserRoles, Permissions, Queue, Media, Audit
2. **Domain Modules** (Tùy chọn) - FlashCards, Collections, Topics, Comments, Checkin, FlashCardsState

**Domain Modules** được điều khiển qua **Feature Flags** trong `src/domains/domain-modules.module.ts`.

## Cấu trúc Module hiện tại

```
src/
├── app.module.ts              # Đăng ký core modules + DomainModulesModule
├── domains/
│   └── domain-modules.module.ts  # Điều khiển domain modules theo feature flags
└── modules/
    ├── auth/                  # Core module (bắt buộc)
    ├── users/                 # Core module (bắt buộc)
    ├── user-roles/            # Core module (bắt buộc)
    ├── permissions/           # Core module (bắt buộc)
    ├── queue/                 # Core module (bắt buộc)
    ├── media/                 # Core module (tùy chọn, S3 flag)
    ├── audit/                 # Core module (bắt buộc)
    ├── flash-cards/           # Domain module (tùy chọn)
    ├── collections/           # Domain module (tùy chọn)
    ├── topics/                # Domain module (tùy chọn)
    ├── comments/              # Domain module (tùy chọn)
    ├── checkin/               # Domain module (tùy chọn)
    └── flash-cards-state/     # Domain module (tùy chọn)
```

## DomainModulesModule hiện tại

**File:** `src/domains/domain-modules.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';
import { FlashCardsModule } from '@modules/flash-cards/flash-cards.module';
import { CollectionsModule } from '@modules/collections/collections.module';
import { TopicsModule } from '@modules/topics/topics.module';
import { CommentsModule } from '@modules/comments/comments.module';
import { CheckinModule } from '@modules/checkin/checkin.module';
import { FlashCardsStateModule } from '@modules/flash-cards-state/flash-cards-state.module';

loadEnv({
  path: process.env.NODE_ENV === 'development' ? '.env.dev' : '.env',
});

const enabledModules = [];

if (process.env.ENABLE_FLASH_CARDS === 'true') {
  enabledModules.push(FlashCardsModule, TopicsModule);
} else if (process.env.ENABLE_TOPICS === 'true') {
  enabledModules.push(TopicsModule);
}
if (process.env.ENABLE_COLLECTIONS === 'true') {
  enabledModules.push(CollectionsModule);
}
if (process.env.ENABLE_COMMENTS === 'true') enabledModules.push(CommentsModule);
if (process.env.ENABLE_CHECKIN === 'true') enabledModules.push(CheckinModule);
if (process.env.ENABLE_FLASH_CARD_STATES === 'true') {
  enabledModules.push(FlashCardsStateModule);
}

@Module({ imports: enabledModules })
export class DomainModulesModule {}
```

## Thêm Module Nghiệp Vụ Mới

### Ví dụ: Thêm Blog Module

### Bước 1: Tạo cấu trúc module

```
src/modules/blog/
├── blog.module.ts
├── blog.controller.ts
├── blog.service.ts
├── dto/
│   ├── create-blog.dto.ts
│   ├── update-blog.dto.ts
│   └── blog.dto.ts
└── entities/
    └── blog.entity.ts
```

### Bước 2: Tạo Entity

**File:** `src/modules/blog/entities/blog.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('blogs')
export class Blog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ default: false })
  isFeatured: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Bước 3: Tạo Module

**File:** `src/modules/blog/blog.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { Blog } from './entities/blog.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Blog])],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
```

### Bước 4: Tạo Migration

```bash
npm run migration:generate -- src/database/migrations/AddBlogTable
```

Hoặc tạo migration thủ công:

**File:** `src/database/migrations/1699999999999-add-blog-table.ts`

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddBlogTable1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'blogs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'slug',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'published', 'archived'],
            default: "'draft'",
          },
          {
            name: 'isFeatured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('blogs');
  }
}
```

Chạy migration:

```bash
npm run migration:run
```

### Bước 5: Thêm Feature Flag

**File:** `.env.dev` hoặc `.env`

```env
ENABLE_BLOG=false
```

### Bước 6: Đăng ký trong DomainModulesModule

**File:** `src/domains/domain-modules.module.ts`

```typescript
import { BlogModule } from '@modules/blog/blog.module';

const enabledModules = [];

// ... existing modules ...

if (process.env.ENABLE_BLOG === 'true') {
  enabledModules.push(BlogModule);
}

@Module({ imports: enabledModules })
export class DomainModulesModule {}
```

### Bước 7: Thêm Feature Guard trong Controller

**File:** `src/modules/blog/blog.controller.ts`

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { FeatureFlag } from '@decorators/feature-flag.decorator';
import { FeatureFlagGuard } from '@guards/feature-flag.guard';

@Controller('blogs')
export class BlogController {
  @Get()
  @FeatureFlag('ENABLE_BLOG')
  @UseGuards(FeatureFlagGuard)
  async findAll() {
    // ...
  }

  @Post()
  @FeatureFlag('ENABLE_BLOG')
  @UseGuards(FeatureFlagGuard)
  async create(@Body() dto: CreateBlogDto) {
    // ...
  }
}
```

### Bước 8: Cập nhật Validation Schema

**File:** `src/configs/validation.schema.ts`

```typescript
export const validationSchema = Joi.object({
  // ... existing configs ...

  ENABLE_BLOG: Joi.boolean().default(false),
});
```

### Bước 9: Chạy Migration và Kiểm tra

```bash
# Chạy migration
npm run migration:run

# Bật module trong .env
ENABLE_BLOG=true

# Restart server
npm run start:dev

# Test endpoint
curl http://localhost:3000/blogs
```

## Bật/Tắt Module

### Bật Module

**Bước 1:** Cập nhật `.env`

```env
ENABLE_BLOG=true
```

**Bước 2:** Restart application

```bash
npm run start:dev
```

**Bước 3:** Routes sẽ được đăng ký và hoạt động

### Tắt Module

**Bước 1:** Cập nhật `.env`

```env
ENABLE_BLOG=false
```

**Bước 2:** Restart application

```bash
npm run start:dev
```

**Bước 3:** Routes sẽ trả về `404 Not Found`

**Lưu ý:** Database tables và data vẫn tồn tại. Để xóa hoàn toàn, xem phần "Xóa Module".

## Thêm Module với Dependencies

### Ví dụ: E-commerce Module phụ thuộc vào Blog

Nếu E-commerce cần Blog:

**File:** `src/domains/domain-modules.module.ts`

```typescript
import { BlogModule } from '@modules/blog/blog.module';
import { EcommerceModule } from '@modules/ecommerce/ecommerce.module';

const enabledModules = [];

if (process.env.ENABLE_BLOG === 'true') {
  enabledModules.push(BlogModule);
}

if (process.env.ENABLE_ECOMMERCE === 'true') {
  // Ecommerce depends on Blog
  if (process.env.ENABLE_BLOG !== 'true') {
    throw new Error('ENABLE_ECOMMERCE requires ENABLE_BLOG=true');
  }
  enabledModules.push(EcommerceModule);
}
```

## Xóa Module Hoàn Toàn

Nếu không cần module nữa và muốn xóa code + database:

### Bước 1: Tạo Migration để xóa bảng

```bash
npm run migration:generate -- src/database/migrations/RemoveBlogTable
```

Hoặc tạo thủ công:

**File:** `src/database/migrations/1700000000000-remove-blog-table.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveBlogTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('blogs');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Create table again if rollback needed
  }
}
```

### Bước 2: Chạy Migration

```bash
npm run migration:run
```

### Bước 3: Xóa khỏi DomainModulesModule

**File:** `src/domains/domain-modules.module.ts`

```typescript
// Remove import
// import { BlogModule } from '@modules/blog/blog.module';

// Remove from enabledModules
// if (process.env.ENABLE_BLOG === 'true') {
//   enabledModules.push(BlogModule);
// }
```

### Bước 4: Xóa Feature Flag khỏi Validation Schema

**File:** `src/configs/validation.schema.ts`

```typescript
// Remove
// ENABLE_BLOG: Joi.boolean().default(false),
```

### Bước 5: Xóa folder module

```bash
rm -rf src/modules/blog
```

### Bước 6: Xóa file migration cũ (optional)

```bash
rm src/database/migrations/1699999999999-add-blog-table.ts
```

## Best Practices

### 1. Tách Core và Domain Modules

- **Core**: Auth, Users, Roles, Permissions, Queue, Audit - luôn cần
- **Domain**: Blog, E-commerce, Forum, etc. - có thể bật/tắt

### 2. Feature Guard cho Tất cả Routes

```typescript
@FeatureFlag('ENABLE_BLOG')
@UseGuards(FeatureFlagGuard)
async findAll() { }
```

### 3. Validation Schema

Luôn thêm feature flag vào validation schema:

```typescript
ENABLE_BLOG: Joi.boolean().default(false),
```

### 4. Database Cleanup

- Tắt flag chỉ ẩn routes
- Để xóa data, cần migration
- Backup trước khi xóa migration

### 5. Module Dependencies

Kiểm tra dependencies trong `DomainModulesModule`:

```typescript
if (process.env.ENABLE_ECOMMERCE === 'true') {
  if (process.env.ENABLE_BLOG !== 'true') {
    throw new Error('ENABLE_ECOMMERCE requires ENABLE_BLOG=true');
  }
}
```

### 6. Documentation

Cập nhật tài liệu khi thêm module mới:

- Thêm vào `docs-v2/03-CHUC-NANG/domain-modules.md`
- Cập nhật `docs-v2/05-CAU-HINH/feature-flags.md`
- Cập nhật `docs-v2/04-API/api-reference.md`

## Ví dụ Hoàn Chỉnh: Thêm Forum Module

### Structure

```
src/modules/forum/
├── forum.module.ts
├── forum.controller.ts
├── forum.service.ts
├── dto/
│   ├── create-topic.dto.ts
│   ├── create-reply.dto.ts
│   └── forum.dto.ts
└── entities/
    ├── forum-topic.entity.ts
    └── forum-reply.entity.ts
```

### DomainModulesModule

```typescript
import { ForumModule } from '@modules/forum/forum.module';

if (process.env.ENABLE_FORUM === 'true') {
  enabledModules.push(ForumModule);
}
```

### .env

```env
ENABLE_FORUM=false
```

### Validation Schema

```typescript
ENABLE_FORUM: Joi.boolean().default(false),
```

### Migration

```typescript
export class AddForumTables1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'forum_topics',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'title', type: 'varchar' },
          { name: 'content', type: 'text' },
          { name: 'authorId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'forum_replies',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'topicId', type: 'uuid' },
          { name: 'content', type: 'text' },
          { name: 'authorId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('forum_replies');
    await queryRunner.dropTable('forum_topics');
  }
}
```

## Troubleshooting

### Module không hoạt động sau khi bật

**Check:**
- Feature flag trong `.env` đúng
- Module được import trong `DomainModulesModule`
- Feature guard trong controller
- Application restarted

### Migration không chạy

**Check:**
- Migration file đúng format
- TypeORM configuration
- Database connection
- `synchronize: false` trong config

### Lỗi Module Dependencies

**Solution:**
- Thêm validation trong `DomainModulesModule`
- Hiển thị error message rõ ràng
- Document dependencies

### Routes trả về 404

**Check:**
- Feature flag enabled
- Feature guard applied
- Module registered
- Controller exported

## Tài liệu liên quan

- [Architecture](architecture.md)
- [Feature Flags](../05-CAU-HINH/feature-flags.md)
- [Domain Modules](../03-CHUC-NANG/domain-modules.md)
- [Configuration](../05-CAU-HINH/environment-variables.md)
