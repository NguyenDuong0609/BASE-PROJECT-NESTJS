# Auditing

Ghi log audit events để theo dõi các hoạt động quan trọng trong hệ thống.

## Tổng quan

- **Database**: PostgreSQL `audit_events` table
- **Extension**: pgAudit (tùy chọn)
- **Access**: Admin only
- **Purpose**: Security, compliance, troubleshooting
- **Feature Flag**: `ENABLE_PGAUDIT=true`

## Audit Events

### Event Types

| Event Type | Description | Category |
|------------|-------------|----------|
| `auth.sign_up` | User registered | Authentication |
| `auth.sign_in` | User logged in | Authentication |
| `auth.sign_in_failed` | Login failed | Authentication |
| `auth.sign_out` | User logged out | Authentication |
| `auth.password_reset_requested` | Password reset requested | Authentication |
| `auth.password_reset_completed` | Password reset completed | Authentication |
| `auth.email_verified` | Email verified | Authentication |
| `user.created` | User created | User Management |
| `user.updated` | User updated | User Management |
| `user.deleted` | User deleted | User Management |
| `user.role_changed` | User role changed | User Management |
| `user.password_changed` | Password changed | User Management |
| `role.created` | Role created | RBAC |
| `role.updated` | Role updated | RBAC |
| `role.deleted` | Role deleted | RBAC |
| `checkin.completed` | Daily check-in | Check-in |
| `media.uploaded` | File uploaded | Media |
| `media.deleted` | File deleted | Media |

## Audit Entity

### AuditEvent Entity

```typescript
@Entity('audit_events')
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventType: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userEmail: string;

  @Column({ nullable: true })
  resourceType: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @Index()
  @Column()
  eventDate: Date;  // For efficient date queries
}
```

### Indexes

```sql
CREATE INDEX idx_audit_events_userId ON audit_events(userId);
CREATE INDEX idx_audit_events_resource ON audit_events(resourceType, resourceId);
CREATE INDEX idx_audit_events_eventType ON audit_events(eventType);
CREATE INDEX idx_audit_events_eventDate ON audit_events(eventDate);
```

## Audit Service

### Audit Service Implementation

```typescript
// src/observability/audit/audit.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './audit-event.entity';
import { Request } from 'express';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private auditRepository: Repository<AuditEvent>,
  ) {}

  async log(options: {
    eventType: string;
    action: string;
    userId?: string;
    userEmail?: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const auditEvent = this.auditRepository.create({
      ...options,
      eventDate: new Date(),
    });

    await this.auditRepository.save(auditEvent);
  }

  async logAuthentication(
    eventType: string,
    userId: string,
    metadata?: Record<string, any>,
  ) {
    return this.log({
      eventType,
      action: eventType,
      userId,
      resourceType: 'User',
      resourceId: userId,
      metadata,
    });
  }

  async logUserAction(
    eventType: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, any>,
  ) {
    return this.log({
      eventType,
      action: eventType,
      userId,
      resourceType,
      resourceId,
      metadata,
    });
  }
}
```

## Usage in Controllers

### Authentication Controller

```typescript
// src/modules/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private auditService: AuditService,
  ) {}

  @Post('sign-in')
  async signIn(@Body() dto: SignInDto, @Req() req: Request) {
    const result = await this.authService.signIn(dto);

    // Log successful login
    await this.auditService.logAuthentication('auth.sign_in', result.user.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return result;
  }

  @Post('sign-in-failed')
  async signInFailed(@Body() dto: SignInDto, @Req() req: Request) {
    // Log failed login attempt
    await this.auditService.log({
      eventType: 'auth.sign_in_failed',
      action: 'auth.sign_in_failed',
      metadata: {
        email: dto.email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    throw new UnauthorizedException('Invalid credentials');
  }
}
```

### Users Controller

```typescript
// src/modules/users/users.controller.ts
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private auditService: AuditService,
  ) {}

  @Delete(':id')
  @Roles('Admin')
  async deleteUser(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const result = await this.usersService.delete(id);

    // Log deletion
    await this.auditService.logUserAction(
      'user.deleted',
      currentUser.id,
      'User',
      id,
      {
        deletedBy: currentUser.email,
        deletedAt: new Date().toISOString(),
      },
    );

    return result;
  }
}
```

## Audit API Endpoints

### GET /audit/events

Filter audit events (Admin only).

**Query params:**
- `eventType` - Filter by event type
- `action` - Filter by action
- `userId` - Filter by user ID
- `resourceType` - Filter by resource type
- `resourceId` - Filter by resource ID
- `limit` - Items per page (default: 50, max: 500)
- `offset` - Pagination offset

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "eventType": "auth.sign_in",
      "action": "auth.sign_in",
      "userId": "uuid",
      "userEmail": "user@example.com",
      "resourceType": "User",
      "resourceId": "uuid",
      "metadata": {
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-10-10T10:00:00.000Z",
      "eventDate": "2026-10-10"
    }
  ],
  "meta": {
    "limit": 50,
    "offset": 0,
    "total": 1000
  }
}
```

**Auth:** Admin

### GET /audit/user/:userId

Get audit events for specific user (Admin only).

**Response 200:**
```json
{
  "success": true,
  "data": [...]
}
```

**Auth:** Admin

### GET /audit/resource/:resourceType/:resourceId

Get audit events for specific resource (Admin only).

**Response 200:**
```json
{
  "success": true,
  "data": [...]
}
```

**Auth:** Admin

## pgAudit Integration

### Setup pgAudit

**Docker Compose:**

```yaml
# docker-compose.prod.yml
postgres_db:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: ${DB_DATABASE}
    POSTGRES_USER: ${DB_USERNAME}
    POSTGRES_PASSWORD: ${DB_PASSWORD}
    POSTGRES_INITDB_ARGS: "-c shared_preload_libraries=pgaudit"
  volumes:
    - ./postgres.conf:/etc/postgresql/postgresql.conf
    - postgres_data:/var/lib/postgresql/data
```

**postgres.conf:**

```ini
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'all'
pgaudit.log_client = on
pgaudit.log_level = 'info'
```

### pgAudit Events

pgAudit logs:

- All DDL statements (CREATE, ALTER, DROP)
- All DML statements (INSERT, UPDATE, DELETE)
- Role changes
- Grant/Revoke permissions

**Example log:**
```
LOG:  AUDIT: SESSION,1,1,READ,SELECT,,public.users,none
LOG:  AUDIT: SESSION,1,1,WRITE,INSERT,,public.users,none
```

## Retention Policy

### Database Retention

```sql
-- Archive old events (older than 90 days)
DELETE FROM audit_events 
WHERE eventDate < NOW() - INTERVAL '90 days';

-- Or partition by month
```

### Log Aggregation

Send audit logs to central logging:

```typescript
// Send to Loki
this.logger.info('AUDIT_EVENT', {
  eventType: 'user.deleted',
  userId: currentUser.id,
  // ... other fields
});
```

## Security Considerations

### 1. Admin-Only Access

```typescript
@UseGuards(JwtAccessTokenGuard, RolesGuard)
@Roles('Admin')
@Controller('audit')
export class AuditController {
  // All endpoints admin-only
}
```

### 2. Sensitive Data

```typescript
// ✅ DO: Log minimal metadata
metadata: {
  changedFields: ['email', 'role'],
  ipAddress: req.ip,
}

// ❌ DON'T: Log sensitive data
metadata: {
  password: user.password,
  token: user.token,
}
```

### 3. Immutable Records

```typescript
// Audit records should never be updated
@Entity()
export class AuditEvent {
  @CreateDateColumn({ readonly: true })
  createdAt: Date;

  @UpdateDateColumn({ readonly: true })
  updatedAt: Date;  // Should never change
}
```

### 4. Timestamps

```typescript
// Use server time, not client time
eventDate: new Date();

// Don't use
eventDate: new Date(clientTimestamp);
```

## Compliance

### GDPR Requirements

- Right to access: Users can request their audit trail
- Right to deletion: Audit records may need anonymization
- Data portability: Export audit data for users

### SOC 2 Requirements

- Audit trails for privileged access
- Immutable audit logs
- Regular review of audit logs
- Alert on suspicious activity

## Best Practices

### 1. Log Important Events Only

```typescript
// ✅ DO: Log important events
await this.auditService.logUserAction('user.deleted', userId, 'User', id);

// ❌ DON'T: Log every read operation
await this.auditService.logUserAction('user.read', userId, 'User', id);
```

### 2. Include Context

```typescript
// Include actor information
await this.auditService.log({
  eventType: 'user.updated',
  action: 'user.updated',
  userId: currentUser.id,
  actorId: currentUser.id,
  actorEmail: currentUser.email,
  metadata: {
    changedFields: getChangedFields(oldUser, newUser),
  },
});
```

### 3. Use Structured Metadata

```typescript
// ✅ DO: Structured metadata
metadata: {
  oldRole: 'User',
  newRole: 'Admin',
  changedBy: 'admin@example.com',
}

// ❌ DON'T: String description
metadata: 'Changed role from User to Admin by admin@example.com'
```

### 4. Index for Queries

```sql
-- Index for common queries
CREATE INDEX idx_audit_events_userId_eventDate 
ON audit_events(userId, eventDate);

CREATE INDEX idx_audit_events_resource_eventDate 
ON audit_events(resourceType, resourceId, eventDate);
```

## Query Examples

### User Activity

```sql
SELECT * FROM audit_events
WHERE userId = 'user-uuid'
ORDER BY eventDate DESC
LIMIT 100;
```

### Resource History

```sql
SELECT * FROM audit_events
WHERE resourceType = 'User'
  AND resourceId = 'user-uuid'
ORDER BY eventDate DESC;
```

### Failed Login Attempts

```sql
SELECT * FROM audit_events
WHERE eventType = 'auth.sign_in_failed'
  AND eventDate > NOW() - INTERVAL '1 day'
ORDER BY eventDate DESC;
```

### Admin Actions

```sql
SELECT * FROM audit_events
WHERE eventType LIKE '%.deleted'
  OR eventType LIKE '%.updated'
ORDER BY eventDate DESC;
```

## Troubleshooting

### Events not being logged

**Check:**
- Audit service called
- Database connection
- Service registered in module
- No exceptions in audit code

### Query performance slow

**Solution:**
- Add composite indexes
- Partition by date
- Archive old records
- Reduce retention period

### Missing events

**Check:**
- All actions call audit service
- Exception handling in audit service
- Transaction rolled back

## Tài liệu liên quan

- [Observability Overview](README.md)
- [Logging](logging.md)
- [Monitoring](monitoring.md)
- [Configuration](../05-CAU-HINH/environment-variables.md)
