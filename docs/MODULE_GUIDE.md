# HƯỚNG DẪN CHI TIẾT CÁC MODULE

**Phiên bản:** 1.0.0  
**Cập nhật lần cuối:** 2026-09-05  
**Thời gian đọc:** 90 phút

---

## 📚 Mục lục

### Module cốt lõi (bắt buộc)
1. [Module Auth](#1-module-auth) - Xác thực và phân quyền
2. [Module Users](#2-module-users) - Quản lý người dùng
3. [Module User Roles](#3-module-user-roles) - Phân quyền theo vai trò

### Module tùy chọn
4. [Module Media](#4-module-media) - Tải lên và lưu trữ tệp (AWS S3)
5. [Module Queue](#5-module-queue) - Xử lý tác vụ nền (BullMQ)
6. [Module Comments](#6-module-comments) - Hệ thống bình luận phân cấp
7. [Module Checkin](#7-module-checkin) - Theo dõi điểm danh hằng ngày
8. [Module Flash Cards](#8-module-flash-cards) - Quản lý flash card
9. [Module Flash Cards State](#9-module-flash-cards-state) - Máy trạng thái
10. [Module Collections](#10-module-collections) - Quản lý bộ sưu tập
11. [Module Topics](#11-module-topics) - Quản lý chủ đề

---

## 🎯 Bảng tổng quan module

| Module | Trạng thái | Database | Phụ thuộc | Mục đích |
|--------|------------|----------|-----------|----------|
| **auth** | Bắt buộc | ✅ | users, user-roles | Xác thực |
| **users** | Bắt buộc | ✅ | user-roles | Quản lý người dùng |
| **user-roles** | Bắt buộc | ✅ | - | RBAC |
| **media** | Tùy chọn | ✅ | users, AWS S3 | Tải tệp lên |
| **queue** | Tùy chọn | Redis | BullMQ | Tác vụ nền |
| **comments** | Tùy chọn | ✅ | users | Hệ thống bình luận |
| **checkin** | Tùy chọn | ✅ | users | Theo dõi điểm danh |
| **flash-cards** | Tùy chọn | ✅ | users, topics | Flash card |
| **flash-cards-state** | Tùy chọn | ✅ | flash-cards | Máy trạng thái |
| **collections** | Tùy chọn | ✅ | users | Bộ sưu tập |
| **topics** | Tùy chọn | ✅ | - | Chủ đề |

---

## 1. Module Auth

### 1.1 Tổng quan

**Mục đích:** Xử lý xác thực người dùng bằng token JWT và OAuth2 (Google).

**Tính năng:**
- ✅ Xác thực nội bộ (email + mật khẩu).
- ✅ Đăng nhập Google OAuth2.
- ✅ Access token và refresh token JWT.
- ✅ Cơ chế làm mới token.
- ✅ Băm mật khẩu bằng bcrypt.

**Phụ thuộc:**
- Module `users`
- Module `user-roles`
- `@nestjs/jwt`
- `@nestjs/passport`
- `passport-google-oauth20`

### 1.2 Cấu trúc tệp

```
auth/
├── dto/
│   ├── sign-in.dto.ts           # Thông tin đăng nhập
│   ├── sign-up.dto.ts           # Dữ liệu đăng ký
│   ├── refresh-token.dto.ts     # Làm mới token
│   └── auth-response.dto.ts     # Phản hồi xác thực
├── strategies/
│   ├── jwt-access-token.strategy.ts   # Kiểm tra JWT
│   ├── jwt-refresh-token.strategy.ts  # Kiểm tra refresh token
│   └── google.strategy.ts             # OAuth Google
├── guards/
│   ├── jwt-access-token.guard.ts      # Bảo vệ route
│   └── jwt-refresh-token.guard.ts     # Bảo vệ endpoint làm mới token
├── auth.controller.ts           # Endpoint xác thực
├── auth.service.ts              # Logic nghiệp vụ xác thực
├── auth.module.ts               # Khai báo module
└── auth.controller.spec.ts      # Unit test
```

### 1.3 Entity

**Không có entity riêng** - Sử dụng entity `User` từ module `users`.

### 1.4 Endpoint API

#### POST /auth/register
Đăng ký người dùng mới bằng email và mật khẩu.

**Nội dung request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Phản hồi: 201 Created**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user"
  }
}
```

**Quy tắc kiểm tra:**
- Email phải đúng định dạng.
- Mật khẩu có tối thiểu 8 ký tự.
- Mật khẩu phải có chữ hoa, chữ thường và chữ số.
- Bắt buộc có tên và họ (2-60 ký tự).

**Lỗi:**
- `409 Conflict` - Email đã được đăng ký.
- `400 Bad Request` - Dữ liệu không hợp lệ.

---

#### POST /auth/login
Đăng nhập bằng email và mật khẩu.

**Nội dung request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Phản hồi: 200 OK**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Lỗi:**
- `401 Unauthorized` - Thông tin đăng nhập không hợp lệ.

---

#### POST /auth/refresh
Làm mới access token bằng refresh token.

**Nội dung request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Phản hồi: 200 OK**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Lỗi:**
- `401 Unauthorized` - Refresh token không hợp lệ hoặc đã hết hạn

---

#### GET /auth/google
Khởi tạo luồng OAuth của Google (chuyển hướng đến Google)

**Phản hồi:** Chuyển hướng đến màn hình cấp quyền của Google

---

#### GET /auth/google/callback
Bộ xử lý callback OAuth của Google

**Tham số truy vấn:**
- `code`: Mã ủy quyền do Google cấp

**Phản hồi:** Chuyển hướng về frontend cùng các token
```
https://frontend-url.com/auth/callback?access_token=...&refresh_token=...
```

---

### 1.5 Logic nghiệp vụ

**Luồng đăng ký:**
```typescript
async signUp(signUpDto: SignUpDto): Promise<AuthResponse> {
  // 1. Kiểm tra email đã tồn tại chưa
  const existingUser = await this.usersService.findByEmail(signUpDto.email);
  if (existingUser) {
    throw new ConflictException('Email already registered');
  }

  // 2. Băm mật khẩu (11 vòng salt)
  const hashedPassword = await bcrypt.hash(signUpDto.password, 11);

  // 3. Lấy vai trò "user" mặc định
  const userRole = await this.userRolesService.findByName('user');

  // 4. Tạo người dùng
  const user = await this.usersService.create({
    ...signUpDto,
    password: hashedPassword,
    role: userRole,
    authProvider: AuthProvider.LOCAL,
  });

  // 5. Tạo token
  const tokens = await this.generateTokens(user);

  // 6. Lưu refresh token (đã băm)
  await this.storeRefreshToken(user.id, tokens.refresh_token);

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    user: this.sanitizeUser(user),
  };
}
```

**Luồng đăng nhập:**
```typescript
async signIn(signInDto: SignInDto): Promise<AuthResponse> {
  // 1. Tìm người dùng (kèm mật khẩu)
  const user = await this.usersService.findByEmail(signInDto.email, {
    includePassword: true,
  });

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // 2. Xác minh mật khẩu
  const isPasswordValid = await bcrypt.compare(
    signInDto.password,
    user.password,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // 3. Tạo token
  const tokens = await this.generateTokens(user);

  // 4. Lưu refresh token mới
  await this.storeRefreshToken(user.id, tokens.refresh_token);

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  };
}
```

**Tạo token:**
```typescript
private async generateTokens(user: User): Promise<Tokens> {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role.name,
  };

  const [access_token, refresh_token] = await Promise.all([
    this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: '15m', // Short-lived
    }),
    this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: '7d', // Long-lived
    }),
  ]);

  return { access_token, refresh_token };
}
```

### 1.6 Guard và Strategy

**Strategy cho access token JWT:**
```typescript
@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  async validate(payload: TokenPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user; // Attached to request.user
  }
}
```

**Guard cho access token JWT:**
```typescript
@Injectable()
export class JwtAccessTokenGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Kiểm tra route có được đánh dấu @Public() hay không
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

### 1.7 Cấu hình bắt buộc

```env
# .env.dev
JWT_ACCESS_TOKEN_SECRET=<generate-64-char-secret>
JWT_REFRESH_TOKEN_SECRET=<generate-64-char-secret>

GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
GOOGLE_CALLBACK_URL=http://localhost:3333/auth/google/callback

FRONTEND_URL=http://localhost:4200
```

**Tạo secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 1.8 Cách gỡ module

**Nếu không cần Google OAuth:**
1. Xóa `GoogleStrategy` khỏi `auth.module.ts`
2. Xóa các endpoint Google khỏi `auth.controller.ts`
3. Gỡ dependency `passport-google-oauth20`

**Không thể gỡ toàn bộ module Auth** - Đây là module cốt lõi của boilerplate

---

## 2. Module Users

### 2.1 Tổng quan

**Mục đích:** Quản lý tài khoản, hồ sơ người dùng và các thao tác CRUD

**Tính năng:**
- ✅ Các thao tác CRUD người dùng
- ✅ Quản lý hồ sơ
- ✅ Cập nhật mật khẩu
- ✅ Gán vai trò
- ✅ Truy vấn có phân trang

**Phụ thuộc:**
- Module `user-roles`
- `TypeORM`

### 2.2 Cấu trúc tệp

```
users/
├── dto/
│   ├── create-user.dto.ts       # User creation
│   ├── update-user.dto.ts       # User updates
│   └── query-user.dto.ts        # Query filters
├── entities/
│   └── user.entity.ts           # User entity
├── users.controller.ts          # User endpoints
├── users.service.ts             # Business logic
├── users.module.ts              # Module definition
└── users.controller.spec.ts     # Unit tests
```

### 2.3 Entity: User

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
  @Exclude() // Không bao giờ để lộ trong response API
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
  deleted_at: Date; // Xóa mềm
}
```

**Chỉ mục:**
- `email` (duy nhất)
- `username` (duy nhất)
- `googleId` (duy nhất)

### 2.4 Endpoint API

#### GET /users
Lấy danh sách người dùng có phân trang (chỉ quản trị viên)

**Tham số truy vấn:**
- `page` (mặc định: 1)
- `limit` (mặc định: 10)
- `role` (lọc theo tên vai trò)
- `search` (tìm theo email/username)

**Phản hồi: 200 OK**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "role": {
        "id": "uuid",
        "name": "user"
      },
      "created_at": "2026-09-05T10:00:00.000Z"
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

---

#### GET /users/me
Lấy hồ sơ người dùng hiện đã xác thực

**Header:**
```
Authorization: Bearer <access_token>
```

**Phản hồi: 200 OK**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "role": {
    "id": "uuid",
    "name": "user",
    "description": "Standard user"
  },
  "isEmailVerified": true,
  "authProvider": "local",
  "created_at": "2026-09-05T10:00:00.000Z"
}
```

---

#### GET /users/:id
Lấy người dùng theo ID (quản trị viên hoặc chính người đó)

**Phản hồi: 200 OK**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "role": {
    "id": "uuid",
    "name": "user"
  }
}
```

**Lỗi:**
- `404 Not Found` - Người dùng không tồn tại
- `403 Forbidden` - Không có quyền xem người dùng này

---

#### PATCH /users/:id
Cập nhật người dùng (quản trị viên hoặc chính người đó)

**Nội dung request:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "username": "janesmith"
}
```

**Phản hồi: 200 OK**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "janesmith",
  "first_name": "Jane",
  "last_name": "Smith"
}
```

**Lỗi:**
- `409 Conflict` - Tên người dùng đã được sử dụng
- `403 Forbidden` - Không có quyền cập nhật người dùng này

---

#### PATCH /users/me/password
Cập nhật mật khẩu (người dùng đã xác thực)

**Nội dung request:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Phản hồi: 200 OK**
```json
{
  "message": "Password updated successfully"
}
```

**Lỗi:**
- `401 Unauthorized` - Mật khẩu hiện tại không chính xác
- `400 Bad Request` - Kiểm tra mật khẩu không thành công

---

#### DELETE /users/:id
Xóa người dùng (chỉ quản trị viên, xóa mềm)

**Phản hồi: 204 No Content**

**Lỗi:**
- `403 Forbidden` - Chỉ quản trị viên mới được xóa người dùng
- `404 Not Found` - Người dùng không tồn tại

---

### 2.5 Logic nghiệp vụ

**Tìm theo email (kèm mật khẩu):**
```typescript
async findByEmail(
  email: string,
  options?: { includePassword?: boolean },
): Promise<User | null> {
  const query = this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.role', 'role')
    .where('user.email = :email', { email });

  if (options?.includePassword) {
    query.addSelect('user.password'); // Bao gồm mật khẩu để xác thực
  }

  return query.getOne();
}
```

**Cập nhật mật khẩu:**
```typescript
async updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  // 1. Lấy người dùng kèm mật khẩu
  const user = await this.findById(userId, { includePassword: true });

  // 2. Xác minh mật khẩu hiện tại
  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    throw new UnauthorizedException('Current password is incorrect');
  }

  // 3. Băm mật khẩu mới
  const hashedPassword = await bcrypt.hash(newPassword, 11);

  // 4. Cập nhật
  await this.userRepository.update(userId, {
    password: hashedPassword,
  });
}
```

**Truy vấn phân trang:**
```typescript
async findAll(query: QueryUserDto): Promise<PaginatedResult<User>> {
  const { page = 1, limit = 10, role, search } = query;

  const queryBuilder = this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.role', 'role');

  // Lọc theo vai trò
  if (role) {
    queryBuilder.andWhere('role.name = :role', { role });
  }

  // Tìm theo email hoặc tên người dùng
  if (search) {
    queryBuilder.andWhere(
      '(user.email ILIKE :search OR user.username ILIKE :search)',
      { search: `%${search}%` },
    );
  }

  // Phân trang
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

### 2.6 Cấu hình bắt buộc

**Không cần cấu hình bổ sung** - Sử dụng cơ sở dữ liệu từ cấu hình chính

### 2.7 Cách gỡ module

**Không thể gỡ** - Module cốt lõi được auth và các module khác yêu cầu

---

## 3. Module User Roles

### 3.1 Tổng quan

**Mục đích:** Hệ thống kiểm soát truy cập dựa trên vai trò (RBAC)

**Tính năng:**
- ✅ Các vai trò được định nghĩa sẵn (admin, user, moderator)
- ✅ Các thao tác CRUD vai trò
- ✅ Gán vai trò cho người dùng
- ✅ Bảo vệ route dựa trên vai trò

**Phụ thuộc:**
- TypeORM

### 3.2 Cấu trúc tệp

```
user-roles/
├── dto/
│   ├── create-user-role.dto.ts
│   └── update-user-role.dto.ts
├── entities/
│   └── user-role.entity.ts
├── user-roles.controller.ts
├── user-roles.service.ts
├── user-roles.module.ts
└── user-roles.controller.spec.ts
```

### 3.3 Entity: UserRole

```typescript
@Entity('user_roles')
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string; // 'admin', 'user', 'moderator'

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;
}
```

**Vai trò mặc định (được tạo sẵn):**
- `admin` - Toàn quyền truy cập hệ thống
- `user` - Quyền truy cập thông thường
- `moderator` - Quyền kiểm duyệt nội dung

### 3.4 Endpoint API

#### GET /user-roles
Lấy tất cả vai trò

**Phản hồi: 200 OK**
```json
[
  {
    "id": "uuid",
    "name": "admin",
    "description": "Administrator with full access",
    "created_at": "2026-09-05T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "name": "user",
    "description": "Standard user",
    "created_at": "2026-09-05T10:00:00.000Z"
  }
]
```

---

#### POST /user-roles
Tạo vai trò mới (chỉ quản trị viên)

**Nội dung request:**
```json
{
  "name": "moderator",
  "description": "Content moderator"
}
```

**Phản hồi: 201 Created**
```json
{
  "id": "uuid",
  "name": "moderator",
  "description": "Content moderator",
  "created_at": "2026-09-05T10:00:00.000Z"
}
```

---

### 3.5 Sử dụng role trong controller

**Decorator @Roles:**
```typescript
import { Roles } from '@decorators/roles.decorator';

@Roles('admin', 'moderator')
@Delete('users/:id')
async deleteUser(@Param('id') id: string) {
  return this.usersService.delete(id);
}
```

**Guard vai trò:**
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.some((role) => user.role?.name === role);
  }
}
```

### 3.6 Cấu hình bắt buộc

**Không cần cấu hình bổ sung** - Sử dụng cơ sở dữ liệu từ cấu hình chính

### 3.7 Cách gỡ module

**Không thể gỡ** - Đây là module cốt lõi được users và auth yêu cầu

---

## 4. Module Media

### 4.1 Tổng quan

**Mục đích:** Tải lên, lưu trữ (AWS S3) và quản lý tệp

**Tính năng:**
- ✅ Tải tệp lên AWS S3
- ✅ Tạo URL tải xuống ký trước
- ✅ Theo dõi siêu dữ liệu tệp
- ✅ Kiểm tra tệp (kích thước, loại)
- ✅ Hỗ trợ tải lên nhiều tệp

**Phụ thuộc:**
- Module `users`
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`
- `multer`

### 4.2 Cấu trúc tệp

```
media/
├── dto/
│   ├── upload-file.dto.ts
│   └── media-file-response.dto.ts
├── entities/
│   └── media-file.entity.ts
├── services/
│   ├── media.service.ts
│   └── s3.service.ts
├── media.controller.ts
├── media.module.ts
└── media.controller.spec.ts
```

### 4.3 Entity: MediaFile

```typescript
@Entity('media_files')
export class MediaFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column({ unique: true })
  s3_key: string; // S3 object key

  @Column()
  mimetype: string;

  @Column('bigint')
  size: number; // Bytes

  @Column({
    type: 'enum',
    enum: MediaFileStatus,
    default: MediaFileStatus.COMPLETED,
  })
  status: MediaFileStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploaded_by: User;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  uploaded_at: Date;
}
```

**Enum: MediaFileStatus**
```typescript
enum MediaFileStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```

### 4.4 Endpoint API

#### POST /media/upload
Tải lên một tệp

**Yêu cầu:**
- Content-Type: `multipart/form-data`
- Tên trường: `file`

**Phản hồi: 201 Created**
```json
{
  "id": "uuid",
  "filename": "document.pdf",
  "s3_key": "uploads/user-id/1630000000000-document.pdf",
  "mimetype": "application/pdf",
  "size": 1024000,
  "status": "completed",
  "uploaded_at": "2026-09-05T10:00:00.000Z"
}
```

**Kiểm tra dữ liệu:**
- Kích thước tối đa: 10 MB (có thể cấu hình)
- Các loại được phép: image/jpeg, image/png, image/gif, application/pdf

**Lỗi:**
- `400 Bad Request` - Tệp quá lớn hoặc sai loại
- `500 Internal Server Error` - Tải tệp lên S3 thất bại

---

#### POST /media/upload-multiple
Tải lên nhiều tệp

**Yêu cầu:**
- Content-Type: `multipart/form-data`
- Tên trường: `files` (mảng)

**Phản hồi: 201 Created**
```json
{
  "files": [
    {
      "id": "uuid-1",
      "filename": "image1.jpg",
      "s3_key": "uploads/user-id/...",
      "size": 500000
    },
    {
      "id": "uuid-2",
      "filename": "image2.jpg",
      "s3_key": "uploads/user-id/...",
      "size": 600000
    }
  ]
}
```

---

#### GET /media/:id/download-url
Lấy URL tải xuống ký trước (có hiệu lực trong 1 giờ)

**Phản hồi: 200 OK**
```json
{
  "url": "https://bucket.s3.amazonaws.com/uploads/.../file.pdf?X-Amz-Algorithm=...",
  "expiresIn": 3600
}
```

**Lỗi:**
- `404 Not Found` - Tệp không tồn tại
- `403 Forbidden` - Không có quyền truy cập tệp này

---

#### DELETE /media/:id
Xóa tệp khỏi S3 và cơ sở dữ liệu

**Phản hồi: 204 No Content**

**Lỗi:**
- `404 Not Found` - Tệp không tồn tại
- `403 Forbidden` - Không có quyền xóa tệp này

---

### 4.5 Logic nghiệp vụ

**Tải tệp lên S3:**
```typescript
async uploadFile(
  file: Express.Multer.File,
  userId: string,
): Promise<MediaFile> {
  // 1. Kiểm tra tệp
  this.validateFile(file);

  // 2. Tạo khóa S3 duy nhất
  const s3Key = `uploads/${userId}/${Date.now()}-${file.originalname}`;

  // 3. Tải tệp lên S3
  await this.s3Service.upload({
    bucket: this.configService.get('AWS_S3_BUCKET'),
    key: s3Key,
    body: file.buffer,
    contentType: file.mimetype,
  });

  // 4. Lưu siêu dữ liệu vào cơ sở dữ liệu
  const mediaFile = this.mediaFileRepository.create({
    filename: file.originalname,
    s3_key: s3Key,
    mimetype: file.mimetype,
    size: file.size,
    uploaded_by: { id: userId },
    status: MediaFileStatus.COMPLETED,
  });

  return this.mediaFileRepository.save(mediaFile);
}
```

**Tạo URL ký trước:**
```typescript
async getDownloadUrl(fileId: string): Promise<{ url: string; expiresIn: number }> {
  // 1. Tìm siêu dữ liệu tệp
  const file = await this.mediaFileRepository.findOne({
    where: { id: fileId },
  });

  if (!file) {
    throw new NotFoundException('File not found');
  }

  // 2. Tạo URL ký trước (1 giờ)
  const url = await this.s3Service.getSignedUrl({
    bucket: this.configService.get('AWS_S3_BUCKET'),
    key: file.s3_key,
    expiresIn: 3600,
  });

  return { url, expiresIn: 3600 };
}
```

**Dịch vụ S3:**
```typescript
@Injectable()
export class S3Service {
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async upload(params: UploadParams): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    });

    await this.s3Client.send(command);
  }

  async getSignedUrl(params: GetSignedUrlParams): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: params.expiresIn,
    });
  }

  async delete(params: DeleteParams): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });

    await this.s3Client.send(command);
  }
}
```

### 4.6 Cấu hình bắt buộc

```env
# .env.dev
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=my-app-bucket

MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

**Thiết lập S3 Bucket:**
1. Tạo S3 bucket trong AWS Console
2. Bật CORS:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```
3. Tạo người dùng IAM có quyền truy cập S3
4. Sao chép Access Key ID và Secret

### 4.7 Cách gỡ module

1. Xóa `media` khỏi danh sách imports trong `app.module.ts`
2. Xóa thư mục `src/modules/media/`
3. Xóa migration: `src/database/migrations/*media*.ts`
4. Chạy migration:revert nếu đã áp dụng migration
5. Gỡ cài đặt: `npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer @types/multer`

---

*Tiếp tục trong cùng tệp...*
## 5. Module Queue

### 5.1 Tổng quan

**Mục đích:** Xử lý tác vụ nền bằng BullMQ và Redis

**Tính năng:**
- ✅ Tác vụ gửi email
- ✅ Tác vụ xử lý ảnh
- ✅ Tác vụ thông báo
- ✅ Cơ chế thử lại tác vụ
- ✅ Lên lịch tác vụ (trễ/lặp lại)
- ✅ Giao diện Bull Board để giám sát

**Phụ thuộc:**
- `@nestjs/bull`
- `bull`
- `bullmq`
- `Redis`

### 5.2 Cấu trúc tệp

```
queue/
├── processors/
│   ├── email.processor.ts        # Email jobs
│   ├── image.processor.ts        # Image processing
│   └── notification.processor.ts # Notifications
├── dto/
│   ├── email-job.dto.ts
│   ├── image-job.dto.ts
│   └── notification-job.dto.ts
├── queue.service.ts              # Job creation
├── queue.module.ts               # Module + Bull config
└── queue.controller.ts           # Bull Board UI
```

### 5.3 Các loại queue

| Tên hàng đợi | Mục đích | Số lần thử lại | Mức ưu tiên |
|------------|---------|-------|----------|
| `email-queue` | Gửi email | 3 lần | Bình thường |
| `image-queue` | Xử lý ảnh | 2 lần | Thấp |
| `notification-queue` | Thông báo đẩy | 5 lần | Cao |

### 5.4 Ví dụ tác vụ

**Tác vụ email:**
```typescript
@Processor('email-queue')
export class EmailProcessor {
  @Process('send-welcome-email')
  async handleWelcomeEmail(job: Job<EmailJobData>) {
    const { to, name } = job.data;

    await this.emailService.send({
      to,
      subject: 'Welcome to our platform!',
      template: 'welcome',
      context: { name },
    });

    return { success: true, sentAt: new Date() };
  }

  @Process('send-password-reset')
  async handlePasswordReset(job: Job<PasswordResetJobData>) {
    const { to, resetToken } = job.data;

    await this.emailService.send({
      to,
      subject: 'Reset your password',
      template: 'password-reset',
      context: { resetToken },
    });
  }
}
```

**Tác vụ xử lý ảnh:**
```typescript
@Processor('image-queue')
export class ImageProcessor {
  @Process('resize-image')
  async handleImageResize(job: Job<ImageResizeJobData>) {
    const { fileId, sizes } = job.data;

    // Tải tệp gốc từ S3
    const original = await this.s3Service.download(fileId);

    // Thay đổi kích thước cho từng cỡ
    for (const size of sizes) {
      const resized = await sharp(original)
        .resize(size.width, size.height)
        .toBuffer();

      // Tải phiên bản đã đổi kích thước lên
      await this.s3Service.upload({
        key: `${fileId}-${size.suffix}`,
        body: resized,
      });
    }

    return { success: true, sizes: sizes.length };
  }

  @Process('optimize-image')
  async handleImageOptimization(job: Job<ImageOptimizeJobData>) {
    const { fileId } = job.data;

    const original = await this.s3Service.download(fileId);
    
    const optimized = await sharp(original)
      .jpeg({ quality: 80 })
      .toBuffer();

    await this.s3Service.upload({
      key: `${fileId}-optimized`,
      body: optimized,
    });
  }
}
```

### 5.5 Thêm tác vụ vào queue

**Dịch vụ hàng đợi:**
```typescript
@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email-queue') private emailQueue: Queue,
    @InjectQueue('image-queue') private imageQueue: Queue,
    @InjectQueue('notification-queue') private notificationQueue: Queue,
  ) {}

  async addEmailJob(data: EmailJobData): Promise<Job> {
    return this.emailQueue.add('send-welcome-email', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s
      },
      removeOnComplete: true,
    });
  }

  async addImageResizeJob(data: ImageResizeJobData): Promise<Job> {
    return this.imageQueue.add('resize-image', data, {
      attempts: 2,
      priority: 5, // Lower priority
    });
  }

  async addDelayedNotification(
    data: NotificationJobData,
    delayMs: number,
  ): Promise<Job> {
    return this.notificationQueue.add('send-notification', data, {
      delay: delayMs, // Delayed execution
      attempts: 5,
    });
  }
}
```

**Cách dùng trong service:**
```typescript
@Injectable()
export class UsersService {
  constructor(private queueService: QueueService) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.userRepository.save(createUserDto);

    // Đưa email chào mừng vào hàng đợi (không chặn)
    await this.queueService.addEmailJob({
      to: user.email,
      name: user.first_name,
    });

    return user;
  }
}
```

### 5.6 Bull Board (giao diện giám sát)

**Truy cập:** http://localhost:3333/admin/queues

**Tính năng:**
- Xem tất cả hàng đợi
- Xem trạng thái tác vụ (waiting, active, completed, failed)
- Thử lại các tác vụ thất bại
- Xóa tác vụ
- Xem chi tiết tác vụ và log

**Thiết lập:**
```typescript
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue(
      { name: 'email-queue' },
      { name: 'image-queue' },
      { name: 'notification-queue' },
    ),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
```

### 5.7 Cấu hình bắt buộc

```env
# .env.dev
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional
```

**Thiết lập Redis (Docker):**
Đã được cấu hình sẵn trong `docker-compose.dev.yml`

### 5.8 Cách gỡ module

1. Xóa `QueueModule` khỏi `app.module.ts`
2. Xóa thư mục `src/modules/queue/`
3. Xóa mọi lời gọi `queueService.addJob()` khỏi các module khác
4. Gỡ cài đặt: `npm uninstall @nestjs/bull bull bullmq`
5. Xóa Redis khỏi `docker-compose.dev.yml` nếu không được dùng ở nơi khác

---

## 6. Module Comments

### 6.1 Tổng quan

**Mục đích:** Hệ thống bình luận phân cấp sử dụng mẫu Closure Table

**Tính năng:**
- ✅ Bình luận lồng nhau (không giới hạn độ sâu)
- ✅ Truy vấn cây hiệu quả (O(1))
- ✅ Lấy toàn bộ chuỗi bình luận
- ✅ Chỉ lấy câu trả lời trực tiếp
- ✅ Lấy đường dẫn các nút tổ tiên
- ✅ Thích/bỏ thích bình luận
- ✅ Xóa mềm theo tầng

**Phụ thuộc:**
- Module `users`
- TypeORM

### 6.2 Cấu trúc tệp

```
comments/
├── dto/
│   ├── create-comment.dto.ts
│   ├── update-comment.dto.ts
│   └── comment-tree-response.dto.ts
├── entities/
│   ├── comment.entity.ts
│   └── comment-closure.entity.ts
├── comments.controller.ts
├── comments.service.ts
├── comments.module.ts
└── comments.controller.spec.ts
```

### 6.3 Entity

**Entity Comment:**
```typescript
@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ default: 0 })
  depth: number; // Depth in tree (0 = root)

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column('uuid', { nullable: true })
  post_id: string; // Tham chiếu đến entity bên ngoài

  @Column({ default: 0 })
  likes_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
```

**Entity Comment Closure:**
```typescript
@Entity('comment_closure')
export class CommentClosure {
  @PrimaryColumn('uuid')
  ancestor_id: string; // Bình luận cha

  @PrimaryColumn('uuid')
  descendant_id: string; // Bình luận con

  @Column({ default: 0 })
  depth: number; // Khoảng cách giữa nút tổ tiên và hậu duệ
}
```

**Ví dụ Closure Table:**
```
Comments tree:
  A
  ├── B
  │   └── D
  └── C

Closure table:
ancestor_id | descendant_id | depth
A           | A             | 0  (self)
A           | B             | 1  (direct child)
A           | C             | 1  (direct child)
A           | D             | 2  (grandchild)
B           | B             | 0  (self)
B           | D             | 1  (direct child)
C           | C             | 0  (self)
D           | D             | 0  (self)
```

### 6.4 Endpoint API

#### POST /comments
Tạo bình luận gốc hoặc câu trả lời

**Nội dung request (bình luận gốc):**
```json
{
  "content": "This is a root comment",
  "post_id": "post-uuid"
}
```

**Nội dung request (câu trả lời):**
```json
{
  "content": "This is a reply",
  "post_id": "post-uuid",
  "parent_id": "comment-uuid"
}
```

**Phản hồi: 201 Created**
```json
{
  "id": "uuid",
  "content": "This is a reply",
  "depth": 1,
  "author": {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe"
  },
  "post_id": "post-uuid",
  "likes_count": 0,
  "created_at": "2026-09-05T10:00:00.000Z"
}
```

---

#### GET /comments/post/:postId
Lấy tất cả bình luận của bài viết (danh sách phẳng)

**Phản hồi: 200 OK**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "content": "Root comment",
      "depth": 0,
      "author": { "first_name": "John" },
      "likes_count": 5
    },
    {
      "id": "uuid-2",
      "content": "Reply to root",
      "depth": 1,
      "author": { "first_name": "Jane" },
      "likes_count": 2
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10
  }
}
```

---

#### GET /comments/:id/tree
Lấy toàn bộ cây con của bình luận (bao gồm mọi hậu duệ)

**Phản hồi: 200 OK**
```json
{
  "root": {
    "id": "uuid-1",
    "content": "Root comment",
    "depth": 0,
    "author": { "first_name": "John" }
  },
  "descendants": [
    {
      "id": "uuid-2",
      "content": "Reply 1",
      "depth": 1
    },
    {
      "id": "uuid-3",
      "content": "Reply to reply",
      "depth": 2
    }
  ]
}
```

---

#### GET /comments/:id/replies
Chỉ lấy câu trả lời trực tiếp (độ sâu = 1)

**Phản hồi: 200 OK**
```json
[
  {
    "id": "uuid-2",
    "content": "Direct reply",
    "depth": 1,
    "author": { "first_name": "Jane" }
  }
]
```

---

#### POST /comments/:id/like
Thích bình luận

**Phản hồi: 200 OK**
```json
{
  "id": "uuid",
  "likes_count": 6
}
```

---

#### DELETE /comments/:id/like
Bỏ thích bình luận

**Phản hồi: 200 OK**
```json
{
  "id": "uuid",
  "likes_count": 5
}
```

---

#### DELETE /comments/:id
Xóa bình luận cùng toàn bộ hậu duệ (xóa mềm)

**Phản hồi: 204 No Content**

---

### 6.5 Logic nghiệp vụ

**Tạo bình luận bằng Closure Table:**
```typescript
async createComment(
  postId: string,
  content: string,
  authorId: string,
  parentId?: string,
): Promise<Comment> {
  return this.dataSource.transaction(async (manager) => {
    // 1. Tạo bình luận
    const comment = manager.create(Comment, {
      content,
      post_id: postId,
      author: { id: authorId },
      depth: 0, // Will update if has parent
    });
    await manager.save(comment);

    if (parentId) {
      // 2. Sao chép các nút tổ tiên của nút cha
      await manager.query(`
        INSERT INTO comment_closure (ancestor_id, descendant_id, depth)
        SELECT ancestor_id, $1, depth + 1
        FROM comment_closure
        WHERE descendant_id = $2
      `, [comment.id, parentId]);

      // 3. Thêm nút cha làm tổ tiên trực tiếp
      await manager.query(`
        INSERT INTO comment_closure (ancestor_id, descendant_id, depth)
        VALUES ($1, $2, 1)
      `, [parentId, comment.id]);

      // 4. Cập nhật depth
      const result = await manager.query(`
        SELECT MAX(depth) as max_depth
        FROM comment_closure
        WHERE descendant_id = $1 AND ancestor_id != $1
      `, [comment.id]);
      comment.depth = (result[0]?.max_depth || 0);
      await manager.save(comment);
    }

    // 5. Thêm tham chiếu đến chính nút đó
    await manager.query(`
      INSERT INTO comment_closure (ancestor_id, descendant_id, depth)
      VALUES ($1, $1, 0)
    `, [comment.id]);

    return comment;
  });
}
```

**Lấy cây bình luận:**
```typescript
async getCommentTree(commentId: string): Promise<Comment[]> {
  return this.commentRepository
    .createQueryBuilder('comment')
    .innerJoin('comment_closure', 'cc', 'cc.descendant_id = comment.id')
    .where('cc.ancestor_id = :commentId', { commentId })
    .leftJoinAndSelect('comment.author', 'author')
    .orderBy('cc.depth', 'ASC')
    .addOrderBy('comment.created_at', 'ASC')
    .getMany();
}
```

**Xóa cây bình luận:**
```typescript
async deleteCommentTree(commentId: string): Promise<void> {
  await this.dataSource.transaction(async (manager) => {
    // Lấy tất cả nút hậu duệ
    const descendants = await manager.query(`
      SELECT descendant_id FROM comment_closure
      WHERE ancestor_id = $1
    `, [commentId]);

    const ids = descendants.map((d) => d.descendant_id);

    // Xóa mềm comments
    await manager.softDelete(Comment, ids);
  });
}
```

### 6.6 Cấu hình bắt buộc

**Không cần cấu hình bổ sung** - Sử dụng cơ sở dữ liệu từ cấu hình chính

### 6.7 Cách gỡ module

1. Xóa `CommentsModule` khỏi `app.module.ts`
2. Xóa thư mục `src/modules/comments/`
3. Xóa migration: `src/database/migrations/*comment*.ts`
4. Chạy `migration:revert` nếu đã áp dụng migration

---

## 7-11. Các module khác (tóm tắt)

Do giới hạn dung lượng, phần dưới đây tóm tắt các module còn lại. Tài liệu đầy đủ có trong mã nguồn.

### 7. Module Checkin

**Mục đích:** Theo dõi điểm danh hằng ngày và đếm chuỗi ngày liên tiếp

**Tính năng:**
- Tạo lượt điểm danh hằng ngày
- Tính chuỗi ngày liên tiếp
- Lịch sử điểm danh

**Endpoint chính:**
- `POST /checkin` - Tạo lượt điểm danh hôm nay
- `GET /checkin/history` - Lấy lịch sử điểm danh
- `GET /checkin/streak` - Lấy chuỗi điểm danh hiện tại

**Gỡ bỏ:** Xóa thư mục module và migration

---

### 8. Module Flash Cards

**Mục đích:** Các thao tác CRUD với flash card

**Tính năng:**
- Tạo/đọc/cập nhật/xóa flash card
- Liên kết với chủ đề
- Gán vào bộ sưu tập

**Endpoint chính:**
- `POST /flash-cards` - Tạo thẻ
- `GET /flash-cards` - Liệt kê thẻ (có phân trang)
- `GET /flash-cards/:id` - Lấy thẻ theo ID
- `PATCH /flash-cards/:id` - Cập nhật thẻ
- `DELETE /flash-cards/:id` - Xóa thẻ

**Gỡ bỏ:** Xóa thư mục module, migration và module state

---

### 9. Module Flash Cards State

**Mục đích:** Máy trạng thái cho quy trình phê duyệt flash card

**Tính năng:**
- Quy trình phê duyệt nhiều bước (DRAFT → IN_REVIEW → APPROVED_ONE → APPROVED_TWO → PUBLISHED)
- Kiểm tra chuyển đổi trạng thái
- Chuyển trạng thái dựa trên vai trò
- Theo dõi lịch sử trạng thái

**Endpoint chính:**
- `POST /flash-cards/:id/submit` - Gửi để xét duyệt
- `POST /flash-cards/:id/approve` - Phê duyệt thẻ
- `POST /flash-cards/:id/reject` - Từ chối thẻ
- `POST /flash-cards/:id/publish` - Xuất bản thẻ
- `GET /flash-cards/:id/transitions` - Lấy các chuyển đổi khả dụng
- `GET /flash-cards/:id/history` - Lấy lịch sử trạng thái

**Gỡ bỏ:** Xóa thư mục module và migration

---

### 10. Module Collections

**Mục đích:** Nhóm flash card thành các bộ sưu tập

**Tính năng:**
- Tạo/đọc/cập nhật/xóa bộ sưu tập
- Thêm/xóa flash card khỏi bộ sưu tập
- Bộ sưu tập riêng của từng người dùng

**Endpoint chính:**
- `POST /collections` - Tạo bộ sưu tập
- `GET /collections` - Liệt kê bộ sưu tập
- `POST /collections/:id/flash-cards` - Thêm thẻ vào bộ sưu tập
- `DELETE /collections/:id/flash-cards/:cardId` - Xóa thẻ khỏi bộ sưu tập

**Gỡ bỏ:** Xóa thư mục module và migration

---

### 11. Module Topics

**Mục đích:** Sắp xếp flash card theo chủ đề

**Tính năng:**
- Tạo/đọc/cập nhật/xóa chủ đề
- Gán flash card vào chủ đề
- Liệt kê flash card theo chủ đề

**Endpoint chính:**
- `POST /topics` - Tạo chủ đề
- `GET /topics` - Liệt kê chủ đề
- `GET /topics/:id/flash-cards` - Lấy thẻ thuộc chủ đề

**Gỡ bỏ:** Xóa thư mục module và migration

---

## 🎯 Đồ thị phụ thuộc giữa các module

```mermaid
graph LR
    Auth --> Users
    Auth --> UserRoles
    Users --> UserRoles
    
    Media --> Users
    Comments --> Users
    Checkin --> Users
    FlashCards --> Users
    FlashCards --> Topics
    FlashCardsState --> FlashCards
    Collections --> Users
    
    Queue -.được dùng bởi.-> Media
    Queue -.used by.-> Auth
    
    style Auth fill:#ff9999
    style Users fill:#99ccff
    style UserRoles fill:#99ff99
```

---

## 🔧 Hướng dẫn gỡ nhanh

### Gỡ module Media
```bash
rm -rf src/modules/media
# Remove from app.module.ts
npm run migration:revert
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer
```

### Gỡ module Queue
```bash
rm -rf src/modules/queue
# Remove from app.module.ts
# Remove queueService calls from other modules
npm uninstall @nestjs/bull bull bullmq
```

### Gỡ module Comments
```bash
rm -rf src/modules/comments
# Remove from app.module.ts
npm run migration:revert
```

### Gỡ các module Flash Cards
```bash
rm -rf src/modules/flash-cards
rm -rf src/modules/flash-cards-state
rm -rf src/modules/collections
rm -rf src/modules/topics
# Remove from app.module.ts
npm run migration:revert  # Multiple times
```

### Gỡ module Checkin
```bash
rm -rf src/modules/checkin
# Remove from app.module.ts
npm run migration:revert
```

---

## 📚 Điều hướng

**Tài liệu liên quan:**
- [Tổng quan hệ thống](./SYSTEM_OVERVIEW.md) - Kiến trúc và các mẫu thiết kế
- [Thêm tính năng](./ADDING_FEATURES.md) - Cách thêm module mới
- [Hướng dẫn cấu hình](./CONFIGURATION_GUIDE.md) - Thiết lập môi trường
- [Bắt đầu nhanh](./QUICK_START.md) - Bắt đầu trong 30 phút

**🔙 Tài liệu chính:**
- [Hướng dẫn Boilerplate](../BOILERPLATE_GUIDE.md) - Danh mục tài liệu

---

**Cập nhật lần cuối:** 2026-09-05
**Phiên bản:** 1.0.0
**Thời gian đọc:** 90 phút

---

*Hết hướng dẫn module*
