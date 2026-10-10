# User Management

Quản lý tài khoản, hồ sơ và quyền truy cập người dùng.

## Tổng quan

User module quản lý:

- CRUD người dùng
- Profile management
- Password update
- Role assignment
- User search và filter
- Soft delete

## Entity Structure

### User Entity

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ unique: true, nullable: true })
  @Index()
  username: string;

  @Column()
  @Exclude()  // Không hiển thị trong response
  password: string;

  @Column({ nullable: true })
  @Exclude()
  googleId: string;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @ManyToOne(() => UserRole, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: UserRole;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;  // Soft delete
}
```

### Indexes

- `email` (unique)
- `username` (unique)
- `googleId` (unique)

## Endpoints

### GET /users

Lấy danh sách users (Admin only).

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 100) |
| `role` | string | - | Filter by role name |
| `search` | string | - | Search email/username |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "role": {
        "id": "uuid",
        "name": "User",
        "description": "Standard user"
      },
      "isEmailVerified": true,
      "authProvider": "local",
      "created_at": "2026-10-10T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

**Auth:** Admin only

### POST /users

Tạo user mới (Admin only).

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "username": "newuser",
  "first_name": "New",
  "last_name": "User",
  "role_id": "role-uuid"
}
```

**Validation:**
- Email: valid format, unique
- Password: min 8 chars, uppercase, lowercase, number
- Username: 3-30 chars, alphanumeric, unique
- first_name: 2-60 chars
- last_name: 2-60 chars
- role_id: valid UUID, tồn tại

**Response 201:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "username": "newuser",
    "first_name": "New",
    "last_name": "User",
    "role": {
      "id": "uuid",
      "name": "User"
    }
  }
}
```

**Auth:** Admin only

### GET /users/me

Lấy profile của user hiện tại.

**Auth:** User (jwt-access-token)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "first_name": "John",
    "last_name": "Doe",
    "role": {
      "id": "uuid",
      "name": "User",
      "description": "Standard user"
    },
    "isEmailVerified": true,
    "authProvider": "local",
    "created_at": "2026-10-10T10:00:00.000Z",
    "updated_at": "2026-10-10T11:00:00.000Z"
  }
}
```

### GET /users/:id

Lấy chi tiết user (Admin hoặc chính user đó).

**Auth:** Admin hoặc Owner

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "first_name": "John",
    "last_name": "Doe",
    "role": {
      "id": "uuid",
      "name": "User"
    },
    "isEmailVerified": true,
    "created_at": "2026-10-10T10:00:00.000Z"
  }
}
```

**Errors:**
- `404 Not Found` - User không tồn tại
- `403 Forbidden` - Không có quyền xem

### PATCH /users/:id

Cập nhật user (Admin hoặc chính user đó).

**Request (Owner):**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "username": "janesmith"
}
```

**Request (Admin):**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "username": "janesmith",
  "role_id": "admin-role-uuid",
  "isEmailVerified": true
}
```

**Policy:**
- Owner: chỉ cập nhật profile (first_name, last_name, username)
- Admin: có thể cập nhật tất cả bao gồm role và verification status

**Response 200:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "janesmith",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": {
      "id": "uuid",
      "name": "User"
    }
  }
}
```

**Errors:**
- `404 Not Found` - User không tồn tại
- `403 Forbidden` - Không có quyền cập nhật
- `409 Conflict` - Username/email đã tồn tại

### DELETE /users/:id

Xóa user (Admin only, soft delete).

**Auth:** Admin only

**Response 204:** No Content

**Errors:**
- `404 Not Found` - User không tồn tại
- `403 Forbidden` - Không phải admin

## Service Methods

### findByEmail

Tìm user theo email.

```typescript
async findByEmail(
  email: string,
  options?: { includePassword?: boolean }
): Promise<User | null> {
  const query = this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.role', 'role')
    .where('user.email = :email', { email });

  if (options?.includePassword) {
    query.addSelect('user.password');
  }

  return query.getOne();
}
```

### findAll

Lấy danh sách users với filter và pagination.

```typescript
async findAll(query: QueryUserDto): Promise<PaginatedResult<User>> {
  const { page = 1, limit = 10, role, search } = query;

  const queryBuilder = this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.role', 'role');

  if (role) {
    queryBuilder.andWhere('role.name = :role', { role });
  }

  if (search) {
    queryBuilder.andWhere(
      '(user.email ILIKE :search OR user.username ILIKE :search)',
      { search: `%${search}%` }
    );
  }

  const [data, total] = await queryBuilder
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### updatePassword

Cập nhật password (self-service).

```typescript
async updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await this.findById(userId, { includePassword: true });

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    throw new UnauthorizedException('Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 11);

  await this.userRepository.update(userId, { password: hashedPassword });
}
```

## Ownership Checks

Service tự động kiểm tra ownership:

```typescript
async updateUser(userId: string, dto: UpdateUserDto, currentUser: User) {
  const user = await this.findById(userId);

  // Admin có thể cập nhật tất cả
  if (currentUser.role.name === 'Admin') {
    return this.userRepository.save({ ...user, ...dto });
  }

  // User chỉ cập nhật chính mình
  if (user.id !== currentUser.id) {
    throw new ForbiddenException('You can only update your own profile');
  }

  // Owner chỉ cập nhật profile fields
  const allowedFields = ['first_name', 'last_name', 'username'];
  const updates = pick(dto, allowedFields);

  return this.userRepository.save({ ...user, ...updates });
}
```

## DTOs

### CreateUserDto

```typescript
export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @Length(2, 60)
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @Length(2, 60)
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  role_id: string;
}
```

### UpdateUserDto

```typescript
export class UpdateUserDto {
  @ApiProperty({ example: 'Jane', required: false })
  @IsString()
  @Length(2, 60)
  @IsOptional()
  first_name?: string;

  @ApiProperty({ example: 'Smith', required: false })
  @IsString()
  @Length(2, 60)
  @IsOptional()
  last_name?: string;

  @ApiProperty({ example: 'janesmith', required: false })
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'uuid', required: false })
  @IsUUID()
  @IsOptional()
  role_id?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean;
}
```

## Audit Events

User events được ghi log:

- `user.created` - User được tạo
- `user.updated` - User được cập nhật
- `user.deleted` - User bị xóa
- `user.password_changed` - Password được thay đổi
- `user.role_changed` - Role được thay đổi

## Security

### Password Exposure

- Password được exclude từ response với `@Exclude()`
- Không bao giờ trả password trong API response
- Hash với bcrypt (11 rounds)

### Soft Delete

- Dùng `@DeleteDateColumn()`
- Không xóa vật lý khỏi database
- Có thể restore
- Queries mặc định ignore deleted records

### Email/Username Uniqueness

- Database unique constraint
- Application-level validation
- Conflict error khi trùng

## Testing

### Unit Tests

```typescript
describe('UsersService', () => {
  it('should create user with hashed password', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'Password123!',
      first_name: 'Test',
      last_name: 'User',
      role_id: 'role-uuid'
    };

    const user = await usersService.create(dto);

    expect(user.password).not.toBe('Password123!');
    expect(bcrypt.compare('Password123!', user.password)).resolves.toBe(true);
  });

  it('should prevent non-admin from updating other users', async () => {
    const regularUser = await createTestUser({ role: 'User' });
    const targetUser = await createTestUser();

    await expect(
      usersService.updateUser(targetUser.id, { first_name: 'Hacked' }, regularUser)
    ).rejects.toThrow(ForbiddenException);
  });
});
```

## Troubleshooting

### Username conflict

- Kiểm tra username đã tồn tại
- Suggest alternative username
- Auto-generate nếu cần

### Role not found

- Verify role_id tồn tại
- Use default role nếu không cung cấp
- Create default roles on seed

### Soft delete visibility

- Deleted users không hiển thị trong list
- Admin có thể query deleted records
- Use `withDeleted()` trong TypeORM

## Tài liệu liên quan

- [Authentication](authentication.md)
- [User Roles](../03-CHUC-NANG/domain-modules.md#user-roles)
- [API Reference](../04-API/api-reference.md)
