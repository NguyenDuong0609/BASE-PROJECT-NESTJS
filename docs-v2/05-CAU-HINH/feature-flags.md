# Feature Flags

Hệ thống feature flags để bật/tắt chức năng mà không cần deploy code mới.

## Tổng quan

Feature flags cho phép:

- Bật/tắt routes domain mẫu
- Control integrations (S3, OAuth, SMTP)
- Enable/disable observability
- A/B testing
- Gradual rollout

## How Feature Flags Work

### Implementation

```typescript
// Feature Guard
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFlag = this.reflector.get<string>(
      'featureFlag',
      context.getHandler(),
    );

    if (!requiredFlag) {
      return true; // No flag required
    }

    const isEnabled = this.configService.get<boolean>(requiredFlag, false);

    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    return true;
  }
}

// Decorator
export const FeatureFlag = (flag: string) => SetMetadata('featureFlag', flag);

// Usage in controller
@Controller('flash-cards')
export class FlashCardsController {
  @Get()
  @FeatureFlag('ENABLE_FLASH_CARDS')
  @UseGuards(FeatureFlagGuard)
  async findAll() {
    return this.flashCardsService.findAll();
  }
}
```

### Behavior

- **Flag disabled (false):** Route trả về `404 Not Found`
- **Flag enabled (true):** Route hoạt động bình thường
- **No flag:** Route luôn hoạt động (core modules)

## Available Feature Flags

### Domain Modules

| Flag | Default | Description | Affects |
|------|---------|-------------|---------|
| `ENABLE_FLASH_CARDS` | `false` | Flash cards CRUD | `/flash-cards/*` |
| `ENABLE_COLLECTIONS` | `false` | Collections CRUD | `/collections/*` |
| `ENABLE_TOPICS` | `false` | Topics CRUD | `/topics/*` |
| `ENABLE_CHECKIN` | `false` | Check-in tracking | `/checkin/*` |
| `ENABLE_COMMENTS` | `false` | Comments system | `/comments/*` |
| `ENABLE_FLASH_CARD_STATES` | `false` | Flash card workflow | `/flash-cards-state/*` |
| `ENABLE_STUDENT_CARD_UPLOADS` | `false` | Student card upload | `/users/student-cards` |

### Integrations

| Flag | Default | Description | Affects |
|------|---------|-------------|---------|
| `ENABLE_S3` | `false` | AWS S3 integration | Media upload/download |
| `ENABLE_GOOGLE_OAUTH` | `false` | Google OAuth2 | `/auth/google/*` |
| `ENABLE_ACCOUNT_EMAIL_FLOWS` | `false` | Email verification/reset | `/auth/password-reset/*`, `/auth/email-verification/*` |
| `REQUIRE_VERIFIED_EMAIL` | `false` | Require verified email | Sign-in/sign-up |
| `ENABLE_METRICS` | `false` | Prometheus metrics | `/metrics` |

### Observability

| Flag | Default | Description | Affects |
|------|---------|-------------|---------|
| `ENABLE_PGAUDIT` | `false` | PostgreSQL audit | Audit logging in DB |
| `ENABLE_AUDIT_UI` | `false` | Grafana/Loki stack | Observability dashboard |

## When to Use Feature Flags

### Use Feature Flags When

1. **Domain modules không cần thiết cho dự án**
   - Flash cards, comments, check-in là domain mẫu
   - Tắt để giảm clutter

2. **Integrations chưa được cấu hình**
   - S3, OAuth, SMTP cần credentials
   - Tắt cho đến khi có cấu hình

3. **Testing new features**
   - Bật cho staging, tắt cho production
   - Gradual rollout

4. **A/B testing**
   - Bật cho nhóm user A, tắt cho nhóm B
   - Measure impact

### Don't Use Feature Flags When

1. **Core functionality**
   - Auth, users, roles luôn cần
   - Không tắt

2. **Security features**
   - Không dùng flag để tắt security
   - Dùng proper RBAC

3. **Permanent decisions**
   - Nếu quyết định xóa feature, xóa code
   - Không giữ flag vĩnh viễn

## Flag Dependency Matrix

Some flags depend on others:

```
REQUIRE_VERIFIED_EMAIL
  └─ requires ENABLE_ACCOUNT_EMAIL_FLOWS=true

ENABLE_ACCOUNT_EMAIL_FLOWS
  └─ requires SMTP configuration

ENABLE_S3
  └─ requires AWS credentials

ENABLE_GOOGLE_OAUTH
  └─ requires Google OAuth credentials

ENABLE_FLASH_CARD_STATES
  └─ requires ENABLE_FLASH_CARDS=true
```

## Best Practices

### 1. Default to Disabled

```env
# ✅ DO: Default to false for optional features
ENABLE_FLASH_CARDS=false

# ❌ DON'T: Default to true for optional features
ENABLE_FLASH_CARDS=true
```

### 2. Document Dependencies

```typescript
/**
 * Requires: ENABLE_FLASH_CARDS=true
 * Purpose: Workflow approval for flash cards
 */
@FeatureFlag('ENABLE_FLASH_CARD_STATES')
async createDraft() { }
```

### 3. Validation in Code

```typescript
@Injectable()
export class FeatureFlagService {
  isFeatureEnabled(flag: string): boolean {
    const enabled = this.configService.get<boolean>(flag, false);

    // Validate dependencies
    if (flag === 'REQUIRE_VERIFIED_EMAIL' && enabled) {
      const emailFlowsEnabled = this.configService.get<boolean>(
        'ENABLE_ACCOUNT_EMAIL_FLOWS',
        false,
      );
      if (!emailFlowsEnabled) {
        throw new BadRequestException(
          'REQUIRE_VERIFIED_EMAIL requires ENABLE_ACCOUNT_EMAIL_FLOWS',
        );
      }
    }

    return enabled;
  }
}
```

### 4. Flag Changes Require Restart

- Changing flags requires application restart
- No hot-reload for flags
- Plan flag changes in maintenance windows

### 5. Monitor Flag Usage

```typescript
// Log flag checks
@FeatureFlag('ENABLE_FLASH_CARDS')
async findAll() {
  this.logger.log('Flash cards feature accessed');
  return this.flashCardsService.findAll();
}
```

## Removing a Feature Flag

When you decide to permanently enable or disable a feature:

### Option 1: Permanently Enable

1. Remove flag check from code
2. Remove from environment variables
3. Update documentation

```typescript
// Before
@FeatureFlag('ENABLE_FLASH_CARDS')
async findAll() { }

// After
async findAll() { }
```

### Option 2: Permanently Disable

1. Remove flag check and related code
2. Remove route registration
3. Clean up database schema (migration)
4. Update documentation

```typescript
// Before
@Controller('flash-cards')
export class FlashCardsController {
  @Get()
  @FeatureFlag('ENABLE_FLASH_CARDS')
  async findAll() { }
}

// After - Remove entire controller
```

## Dynamic Feature Flags (Future)

Current implementation uses static environment variables. For dynamic flags:

### Database-backed Flags

```typescript
@Entity('feature_flags')
export class FeatureFlag {
  @Column()
  name: string;

  @Column()
  enabled: boolean;

  @Column('jsonb')
  rules: {
    userSegments?: string[];
    percentage?: number;
  };
}
```

### User-specific Flags

```typescript
async isFeatureEnabledForUser(flag: string, userId: string): Promise<boolean> {
  const flagConfig = await this.featureFlagRepository.findOne({
    where: { name: flag },
  });

  if (!flagConfig || !flagConfig.enabled) {
    return false;
  }

  // Check user segments
  if (flagConfig.rules.userSegments) {
    const user = await this.usersService.findById(userId);
    return flagConfig.rules.userSegments.includes(user.segment);
  }

  // Check percentage rollout
  if (flagConfig.rules.percentage) {
    const hash = this.hash(userId + flag);
    return (hash % 100) < flagConfig.rules.percentage;
  }

  return true;
}
```

## Testing with Feature Flags

### Unit Tests

```typescript
describe('FlashCardsController', () => {
  it('should return 404 when feature disabled', async () => {
    configService.get.mockReturnValue(false);

    await expect(controller.findAll()).rejects.toThrow(NotFoundException);
  });

  it('should return data when feature enabled', async () => {
    configService.get.mockReturnValue(true);

    const result = await controller.findAll();
    expect(result).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('Feature Flags Integration', () => {
  beforeEach(async () => {
    process.env.ENABLE_FLASH_CARDS = 'true';
    await app.init();
  });

  it('should allow access when flag enabled', async () => {
    const response = await request(app.getHttpServer())
      .get('/flash-cards')
      .expect(200);
  });
});
```

## Monitoring Flag Usage

Track flag usage metrics:

```typescript
// In feature guard
if (!isEnabled) {
  this.metricsService.increment('feature_flag_disabled', {
    flag: requiredFlag,
  });
  throw new NotFoundException('Feature not enabled');
}

this.metricsService.increment('feature_flag_enabled', {
  flag: requiredFlag,
});
```

## Troubleshooting

### Flag not working

**Check:**
- Environment variable set correctly
- Application restarted after change
- Flag name matches exactly
- No caching interfering

### Dependency conflict

**Check:**
- Required flags enabled
- Configuration valid
- No circular dependencies

### Flag in production

**Risk:**
- Accidentally enabling features
- Security implications
- Performance impact

**Mitigation:**
- Code review flag changes
- Test in staging first
- Monitor after change

## Tài liệu liên quan

- [Environment Variables](environment-variables.md)
- [Domain Modules](../03-CHUC-NANG/domain-modules.md)
- [Configuration - Overview](README.md)
