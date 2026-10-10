# Third-party Integration

Hướng dẫn tích hợp các dịch vụ bên thứ ba (AWS S3, Google OAuth, SMTP).

## Tổng quan

Dự án hỗ trợ tích hợp với:

- AWS S3 - File storage
- Google OAuth2 - Authentication
- SMTP - Email delivery

## AWS S3 Integration

### Prerequisites

- AWS Account
- S3 Bucket created
- IAM user or role with permissions
- Feature flag: `ENABLE_S3=true`

### Configuration

```env
ENABLE_S3=true
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
```

### IAM Permissions

Minimum required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### S3 Service Implementation

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = this.configService.get('AWS_S3_BUCKET');
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
```

### Best Practices

1. **Use IAM Roles instead of Keys**
   - In production, use EC2/ECS instance profile
   - Or use workload identity in Kubernetes

2. **Bucket Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Deny",
         "Principal": "*",
         "Action": "s3:*",
         "Resource": "arn:aws:s3:::your-bucket/*",
         "Condition": {
           "Bool": {
             "aws:SecureTransport": "false"
           }
         }
       }
     ]
   }
   ```

3. **Enable Versioning**
   - Track file changes
   - Enable rollback capability

4. **Enable Lifecycle Rules**
   - Move old files to Glacier
   - Delete temporary files

## Google OAuth2 Integration

### Prerequisites

- Google Cloud Project
- OAuth 2.0 credentials
- Authorized redirect URI
- Feature flag: `ENABLE_GOOGLE_OAUTH=true`

### Configuration

```env
ENABLE_GOOGLE_OAUTH=true
GOOGLE_CLIENT_ID=<client-id-from-google-console>
GOOGLE_CLIENT_SECRET=<client-secret-from-google-console>
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

### Setup Google Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 client ID
5. Set authorized redirect URIs:
   - Development: `http://localhost:3000/auth/google/callback`
   - Production: `https://yourdomain.com/auth/google/callback`
6. Copy Client ID and Client Secret

### Google Strategy Implementation

```typescript
import { Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ) {
    const { id, emails, name } = profile;

    let user = await this.usersService.findByGoogleId(id);

    if (!user) {
      user = await this.usersService.create({
        email: emails[0].value,
        googleId: id,
        first_name: name.givenName,
        last_name: name.familyName,
        authProvider: AuthProvider.GOOGLE,
      });
    }

    done(null, user);
  }
}
```

### Endpoints

```typescript
@Controller('auth')
export class AuthController {
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @FeatureFlag('ENABLE_GOOGLE_OAUTH')
  async googleAuth() {
    // Initiates OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @FeatureFlag('ENABLE_GOOGLE_OAUTH')
  async googleAuthCallback(@Req() req, @Res() res) {
    const { user } = req;
    const tokens = await this.authService.generateTokens(user);

    // Redirect to frontend with tokens
    return res.redirect(
      `${this.configService.get('FRONTEND_URL')}/auth/callback?` +
        `access_token=${tokens.access_token}&` +
        `refresh_token=${tokens.refresh_token}`,
    );
  }
}
```

### Best Practices

1. **Validate Email Domain**
   - Restrict to specific domains
   - Whitelist corporate emails

2. **Handle Account Linking**
   - Link Google account to existing local account
   - Ask user to link if email exists

3. **Security**
   - Use HTTPS in production
   - Validate state parameter to prevent CSRF
   - Set secure cookie flags

## SMTP Integration

### Prerequisites

- SMTP server access
- Email credentials
- Feature flag: `ENABLE_ACCOUNT_EMAIL_FLOWS=true`

### Configuration

```env
ENABLE_ACCOUNT_EMAIL_FLOWS=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Your App
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
```

### Common SMTP Providers

| Provider | Host | Port | Secure |
|----------|------|------|--------|
| SendGrid | smtp.sendgrid.net | 587 | false |
| Mailgun | smtp.mailgun.org | 587 | false |
| AWS SES | email-smtp.us-east-1.amazonaws.com | 587 | false |
| Gmail | smtp.gmail.com | 587 | true |

### Email Service Implementation

```typescript
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE'),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get('SMTP_FROM_EMAIL'),
      to,
      subject,
      html,
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;

    await this.sendEmail(
      email,
      'Reset Your Password',
      `
        <h1>Reset Your Password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 30 minutes.</p>
      `,
    );
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const verifyUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;

    await this.sendEmail(
      email,
      'Verify Your Email',
      `
        <h1>Verify Your Email</h1>
        <p>Click the link below to verify your email:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
        <p>This link expires in 24 hours.</p>
      `,
    );
  }
}
```

### Email Templates

Use Handlebars or EJS for dynamic templates:

```typescript
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';

@Injectable()
export class EmailTemplateService {
  renderTemplate(templateName: string, context: any): string {
    const template = readFileSync(`templates/${templateName}.hbs`, 'utf-8');
    const compiled = Handlebars.compile(template);
    return compiled(context);
  }
}
```

### Best Practices

1. **Use Template Engine**
   - Handlebars, EJS, or Pug
   - Separate HTML from code
   - Reusable components

2. **Email Deliverability**
   - Set up SPF, DKIM, DMARC
   - Use dedicated IP for high volume
   - Monitor bounce rates

3. **Queue Email Sending**
   - Don't block HTTP response
   - Use BullMQ queue
   - Retry failed sends

4. **Tracking**
   - Add tracking pixels
   - Use link tracking
   - Monitor open/click rates

## Testing Integrations

### S3 Testing

```typescript
describe('S3Service', () => {
  it('should upload file to S3', async () => {
    const buffer = Buffer.from('test content');
    const url = await s3Service.uploadFile('test.txt', buffer, 'text/plain');

    expect(url).toContain('s3.amazonaws.com');
  });
});
```

### OAuth Testing

Use test OAuth credentials or mock the strategy:

```typescript
describe('GoogleStrategy', () => {
  it('should create new user on first login', async () => {
    const profile = {
      id: 'google-id',
      emails: [{ value: 'test@example.com' }],
      name: { givenName: 'Test', familyName: 'User' },
    };

    const user = await strategy.validate(null, null, profile, null);

    expect(user.email).toBe('test@example.com');
  });
});
```

### SMTP Testing

Use Ethereal Email for testing:

```typescript
// In development
if (configService.isDevelopment) {
  const testAccount = await nodemailer.createTestAccount();
  this.transporter = createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}
```

## Troubleshooting

### S3 Issues

**Access Denied:**
- Check IAM permissions
- Verify bucket name
- Check region

**CORS Errors:**
- Configure CORS on bucket
- Allow origin in bucket policy

### OAuth Issues

**Redirect URI Mismatch:**
- Check Google Console settings
- Match exact URL including trailing slash
- Include http/https correctly

**Invalid Client:**
- Verify Client ID and Secret
- Check OAuth consent screen status

### SMTP Issues

**Connection Refused:**
- Check SMTP host and port
- Verify firewall rules
- Check TLS/SSL settings

**Authentication Failed:**
- Verify username/password
- Check API key (for SendGrid)
- Check app-specific password (for Gmail)

## Security Considerations

### S3

- Never commit AWS credentials
- Use IAM roles in production
- Enable bucket encryption
- Restrict public access

### OAuth

- Use HTTPS only in production
- Validate state parameter
- Limit token scopes
- Monitor for abuse

### SMTP

- Never commit SMTP credentials
- Use TLS/SSL
- Implement rate limiting
- Monitor for spam

## Tài liệu liên quan

- [Environment Variables](environment-variables.md)
- [Feature Flags](feature-flags.md)
- [File Upload](../03-CHUC-NANG/file-upload.md)
- [Authentication](../03-CHUC-NANG/authentication.md)
