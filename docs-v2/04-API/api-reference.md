# API Reference

Danh sách đầy đủ tất cả API endpoints với request/response examples.

## Base URL

- **Development**: `http://localhost:3000`
- **Staging**: `https://staging.yourdomain.com`
- **Production**: `https://yourdomain.com`

## Authentication

All protected endpoints require Bearer token:

```http
Authorization: Bearer <access_token>
```

Or use cookie-based auth with CSRF token.

## 1. Authentication

### POST /auth/sign-up

Register new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": {
        "id": "uuid",
        "name": "User"
      }
    }
  }
}
```

**Auth:** Public

### POST /auth/sign-in

Sign in with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Auth:** Public

### POST /auth/refresh

Refresh access token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Auth:** Public (refresh token)

### POST /auth/logout

Logout and revoke refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Auth:** Public (refresh token)

### GET /auth/csrf-token

Get CSRF token for cookie-based auth.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "csrfToken": "token-string"
  }
}
```

**Auth:** Public

### GET /auth/google

Initiate Google OAuth flow.

**Response:** Redirect to Google

**Auth:** Public

**Feature Flag:** `ENABLE_GOOGLE_OAUTH=true`

### GET /auth/google/callback

Handle Google OAuth callback.

**Query params:** `code`

**Response:** Redirect to frontend with tokens

**Auth:** Public

**Feature Flag:** `ENABLE_GOOGLE_OAUTH=true`

### POST /auth/password-reset/request

Request password reset.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

**Auth:** Public

**Feature Flag:** `ENABLE_ACCOUNT_EMAIL_FLOWS=true`

### POST /auth/password-reset/confirm

Confirm password reset with token.

**Request:**
```json
{
  "token": "reset-token",
  "new_password": "NewSecurePass123!"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Auth:** Public

**Feature Flag:** `ENABLE_ACCOUNT_EMAIL_FLOWS=true`

### POST /auth/email-verification/request

Request email verification.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Verification email sent if account exists"
}
```

**Auth:** Public

**Feature Flag:** `ENABLE_ACCOUNT_EMAIL_FLOWS=true`

### POST /auth/email-verification/confirm

Verify email with token.

**Request:**
```json
{
  "token": "verification-token"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Auth:** Public

**Feature Flag:** `ENABLE_ACCOUNT_EMAIL_FLOWS=true`

## 2. Users

### GET /users

List all users (Admin only).

**Query params:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `role` (filter by role name)
- `search` (search email/username)

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
        "name": "User"
      },
      "isEmailVerified": true,
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

**Auth:** Admin

### POST /users

Create new user (Admin only).

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

**Auth:** Admin

### GET /users/me

Get current user profile.

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

**Auth:** User

### GET /users/:id

Get user by ID (Admin or owner).

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
    }
  }
}
```

**Auth:** Admin or Owner

### PATCH /users/:id

Update user (Admin or owner).

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

**Response 200:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "first_name": "Jane",
    "last_name": "Smith",
    "username": "janesmith"
  }
}
```

**Auth:** Admin or Owner

### DELETE /users/:id

Delete user (Admin only, soft delete).

**Response 204:** No Content

**Auth:** Admin

### POST /users/student-cards

Upload student card (stub, returns 501).

**Auth:** Admin

**Feature Flag:** `ENABLE_STUDENT_CARD_UPLOADS=true`

## 3. User Roles

### GET /user-roles

List all roles (Admin only).

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Admin",
      "description": "Administrator with full access",
      "created_at": "2026-10-10T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "name": "User",
      "description": "Standard user",
      "created_at": "2026-10-10T10:00:00.000Z"
    }
  ]
}
```

**Auth:** Admin

### POST /user-roles

Create new role (Admin only).

**Request:**
```json
{
  "name": "Moderator",
  "description": "Content moderator"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "id": "uuid",
    "name": "Moderator",
    "description": "Content moderator"
  }
}
```

**Auth:** Admin

### GET /user-roles/:id

Get role by ID (Admin only).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Admin",
    "description": "Administrator with full access"
  }
}
```

**Auth:** Admin

### PATCH /user-roles/:id

Update role (Admin only).

**Request:**
```json
{
  "description": "Updated description"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Role updated successfully",
  "data": {
    "id": "uuid",
    "name": "Admin",
    "description": "Updated description"
  }
}
```

**Auth:** Admin

### DELETE /user-roles/:id

Delete role (Admin only).

**Response 204:** No Content

**Auth:** Admin

## 4. Topics (Feature Flag)

### GET /topics

List topics.

**Query params:**
- `page`, `limit`, `search`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "JavaScript Basics",
      "description": "Core JavaScript concepts",
      "flash_cards_count": 15,
      "created_at": "2026-10-10T10:00:00.000Z"
    }
  ]
}
```

**Auth:** User

**Feature Flag:** `ENABLE_TOPICS=true`

### POST /topics

Create topic.

**Request:**
```json
{
  "name": "JavaScript Basics",
  "description": "Core JavaScript concepts"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Topic created successfully",
  "data": {
    "id": "uuid",
    "name": "JavaScript Basics",
    "description": "Core JavaScript concepts"
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_TOPICS=true`

### GET /topics/:id

Get topic by ID.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "JavaScript Basics",
    "description": "Core JavaScript concepts",
    "flash_cards_count": 15
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_TOPICS=true`

### PATCH /topics/:id

Update topic.

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Topic updated successfully",
  "data": {
    "id": "uuid",
    "name": "Updated Name"
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_TOPICS=true`

### DELETE /topics/:id

Delete topic.

**Response 204:** No Content

**Auth:** User

**Feature Flag:** `ENABLE_TOPICS=true`

## 5. Collections (Feature Flag)

### GET /collections

List collections.

**Query params:**
- `page`, `limit`, `search`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Frontend Fundamentals",
      "description": "HTML, CSS, JS basics",
      "cover_image_url": "https://s3.amazonaws.com/...",
      "user_id": "uuid",
      "created_at": "2026-10-10T10:00:00.000Z"
    }
  ]
}
```

**Auth:** User

**Feature Flag:** `ENABLE_COLLECTIONS=true`

### POST /collections

Create collection.

**Request:**
```json
{
  "name": "Frontend Fundamentals",
  "description": "HTML, CSS, JS basics"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Collection created successfully",
  "data": {
    "id": "uuid",
    "name": "Frontend Fundamentals"
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_COLLECTIONS=true`

### GET /collections/:id

Get collection by ID.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Frontend Fundamentals",
    "description": "HTML, CSS, JS basics",
    "flash_cards": [...]
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_COLLECTIONS=true`

### PATCH /collections/:id

Update collection.

**Response 200:**
```json
{
  "success": true,
  "message": "Collection updated successfully"
}
```

**Auth:** User

**Feature Flag:** `ENABLE_COLLECTIONS=true`

### DELETE /collections/:id

Delete collection.

**Response 204:** No Content

**Auth:** User

**Feature Flag:** `ENABLE_COLLECTIONS=true`

## 6. Flash Cards (Feature Flag)

### GET /flash-cards

List flash cards.

**Query params:**
- `page`, `limit`, `topic_id`, `collection_id`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "question": "What is closure?",
      "answer": "Function with access to outer scope",
      "topic_id": "uuid",
      "collection_id": "uuid",
      "created_at": "2026-10-10T10:00:00.000Z"
    }
  ]
}
```

**Auth:** User

**Feature Flag:** `ENABLE_FLASH_CARDS=true`

### POST /flash-cards

Create flash card.

**Request:**
```json
{
  "question": "What is closure?",
  "answer": "Function with access to outer scope",
  "topic_id": "uuid",
  "collection_id": "uuid"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Flash card created successfully",
  "data": {
    "id": "uuid",
    "question": "What is closure?"
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_FLASH_CARDS=true`

### GET /flash-cards/:id

Get flash card by ID.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "question": "What is closure?",
    "answer": "Function with access to outer scope"
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_FLASH_CARDS=true`

### PATCH /flash-cards/:id

Update flash card.

**Response 200:**
```json
{
  "success": true,
  "message": "Flash card updated successfully"
}
```

**Auth:** User

**Feature Flag:** `ENABLE_FLASH_CARDS=true`

### DELETE /flash-cards/:id

Delete flash card.

**Response 204:** No Content

**Auth:** User

**Feature Flag:** `ENABLE_FLASH_CARDS=true`

## 7. Flash Cards State (Feature Flag)

### GET /flash-cards-state

List flash cards with state.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "flash_card": {
        "question": "What is React?",
        "answer": "A JS library for UIs"
      },
      "state": "DRAFT",
      "transition_history": []
    }
  ]
}
```

**Auth:** User

**Feature Flag:** `ENABLE_FLASH_CARD_STATES=true`

### POST /flash-cards-state

Create draft flash card.

**Request:**
```json
{
  "question": "What is React?",
  "answer": "A JS library for UIs"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Draft created successfully",
  "data": {
    "id": "uuid",
    "state": "DRAFT"
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_FLASH_CARD_STATES=true`

### POST /flash-cards-state/:id/submit

Submit for review.

**Response 200:**
```json
{
  "success": true,
  "message": "Submitted for review",
  "data": {
    "state": "IN_REVIEW"
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_FLASH_CARD_STATES=true`

### POST /flash-cards-state/:id/approve

Approve flash card.

**Request:**
```json
{
  "comment": "Good content"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Approved successfully",
  "data": {
    "state": "APPROVED_ONE"
  }
}
```

**Auth:** Reviewer

**Feature Flag:** `ENABLE_FLASH_CARD_STATES=true`

### POST /flash-cards-state/:id/reject

Reject flash card.

**Request:**
```json
{
  "comment": "Needs more detail"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Rejected successfully",
  "data": {
    "state": "DRAFT"
  }
}
```

**Auth:** Reviewer

**Feature Flag:** `ENABLE_FLASH_CARD_STATES=true`

### POST /flash-cards-state/:id/publish

Publish flash card.

**Response 200:**
```json
{
  "success": true,
  "message": "Published successfully",
  "data": {
    "state": "PUBLISHED"
  }
}
```

**Auth:** Admin

**Feature Flag:** `ENABLE_FLASH_CARD_STATES=true`

### GET /flash-cards-state/:id/transitions

Get transition history.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "transitions": [
      {
        "from": "DRAFT",
        "to": "IN_REVIEW",
        "at": "2026-10-10T10:00:00.000Z",
        "by": "user-uuid",
        "comment": "Submitted for review"
      }
    ]
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_FLASH_CARD_STATES=true`

### GET /flash-cards-state/:id/allowed-transitions

Get allowed state transitions.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "currentState": "DRAFT",
    "allowedTransitions": ["IN_REVIEW"]
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_FLASH_CARD_STATES=true`

## 8. Comments (Feature Flag)

### POST /comments/posts/:postId

Create root comment.

**Request:**
```json
{
  "content": "Great article!"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "id": "uuid",
    "content": "Great article!",
    "depth": 0,
    "likes_count": 0
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_COMMENTS=true`

### POST /comments/:commentId/replies

Create reply to comment.

**Request:**
```json
{
  "content": "I agree!"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Reply created successfully",
  "data": {
    "id": "uuid",
    "content": "I agree!",
    "depth": 1
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_COMMENTS=true`

### GET /comments/posts/:postId/tree

Get comment tree.

**Query params:**
- `offset` (default: 0)
- `limit` (default: 10, max: 100)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "Great article!",
      "depth": 0,
      "replies": [
        {
          "id": "uuid",
          "content": "I agree!",
          "depth": 1
        }
      ]
    }
  ]
}
```

**Auth:** User

**Feature Flag:** `ENABLE_COMMENTS=true`

### GET /comments/:id/ancestors

Get ancestor comments.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "Root comment",
      "depth": 0
    }
  ]
}
```

**Auth:** User

**Feature Flag:** `ENABLE_COMMENTS=true`

### GET /comments/:id/descendants

Get descendant comments.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "Reply 1",
      "depth": 1
    },
    {
      "id": "uuid",
      "content": "Reply to reply",
      "depth": 2
    }
  ]
}
```

**Auth:** User

**Feature Flag:** `ENABLE_COMMENTS=true`

### PATCH /comments/:id

Update comment.

**Request:**
```json
{
  "content": "Updated content"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Comment updated successfully"
}
```

**Auth:** Owner

**Feature Flag:** `ENABLE_COMMENTS=true`

### DELETE /comments/:id

Delete comment.

**Response 204:** No Content

**Auth:** Owner

**Feature Flag:** `ENABLE_COMMENTS=true`

## 9. Check-in (Feature Flag)

### POST /checkin

Daily check-in.

**Response 200:**
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "streak_count": 15,
    "total_checkins": 145,
    "points_earned": 10
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_CHECKIN=true`

### GET /checkin/history

Get check-in history.

**Query params:**
- `page`, `limit`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "checkin_date": "2026-10-10",
      "streak_count": 15
    }
  ]
}
```

**Auth:** User

**Feature Flag:** `ENABLE_CHECKIN=true`

### GET /checkin/stats

Get check-in statistics.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "current_streak": 15,
    "longest_streak": 30,
    "total_checkins": 145,
    "points": 1500
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_CHECKIN=true`

### GET /checkin/status

Get today's check-in status.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "checked_in": false,
    "can_check_in": true
  }
}
```

**Auth:** User

**Feature Flag:** `ENABLE_CHECKIN=true`

## 10. Media

### POST /media/upload

Upload file.

**Request:** multipart/form-data

**Response 201:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "uuid",
    "filename": "image.jpg",
    "s3_key": "uploads/uuid/image.jpg",
    "mimetype": "image/jpeg",
    "size": 1234567,
    "status": "completed"
  }
}
```

**Auth:** User

### GET /media/:id

Get file metadata.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "image.jpg",
    "s3_key": "uploads/uuid/image.jpg",
    "mimetype": "image/jpeg",
    "size": 1234567
  }
}
```

**Auth:** Owner or Admin

### GET /media/:id/download

Get presigned download URL.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "download_url": "https://bucket.s3.amazonaws.com/key?signature=...",
    "expires_in": 3600
  }
}
```

**Auth:** Owner or Admin

### DELETE /media/:id

Delete file.

**Response 204:** No Content

**Auth:** Owner or Admin

## 11. Queue

### GET /queues/:name/status

Get queue statistics.

**Params:**
- `name`: Queue name (email, image, notification)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "name": "email",
    "waiting": 5,
    "active": 2,
    "completed": 1000,
    "failed": 3,
    "delayed": 0,
    "paused": false
  }
}
```

**Auth:** Admin or Internal

### GET /queues/:name/jobs/:jobId

Get job details.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "job-id",
    "name": "send-email",
    "data": {
      "to": "user@example.com",
      "subject": "Welcome"
    },
    "progress": 100,
    "attemptsMade": 1,
    "processedOn": 1696944000000
  }
}
```

**Auth:** Admin or Internal

## 12. Audit

### GET /audit/events

Filter audit events (Admin only).

**Query params:**
- `eventType`
- `action`
- `userId`
- `resourceType`
- `resourceId`
- `limit`
- `offset`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "eventType": "auth.sign_in",
      "action": "user_login",
      "userId": "uuid",
      "resourceType": "User",
      "resourceId": "uuid",
      "metadata": {},
      "created_at": "2026-10-10T10:00:00.000Z"
    }
  ]
}
```

**Auth:** Admin

### GET /audit/user/:userId

Get audit events for specific user.

**Response 200:**
```json
{
  "success": true,
  "data": [...]
}
```

**Auth:** Admin

### GET /audit/resource/:resourceType/:resourceId

Get audit events for specific resource.

**Response 200:**
```json
{
  "success": true,
  "data": [...]
}
```

**Auth:** Admin

## 13. Health & Metrics

### GET /

Welcome message.

**Response 200:**
```json
{
  "message": "Welcome to NestJS Base API",
  "version": "1.0.0"
}
```

**Auth:** Public

### GET /health

Liveness check (alias).

**Response 200:**
```json
{
  "status": "ok"
}
```

**Auth:** Public

### GET /health/live

Process liveness check.

**Response 200:**
```json
{
  "status": "ok"
}
```

**Auth:** Public

### GET /health/ready

Readiness check (PostgreSQL + Redis).

**Response 200:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    }
  }
}
```

**Response 503:**
```json
{
  "status": "error",
  "error": {
    "database": {
      "status": "down"
    }
  }
}
```

**Auth:** Public

### GET /metrics

Prometheus metrics (text format).

**Auth:** Private (network restricted)

**Feature Flag:** `ENABLE_METRICS=true`

## Rate Limiting

| Endpoint | Limit | Per |
|----------|-------|-----|
| `/auth/sign-up` | 5/hour | IP |
| `/auth/sign-in` | 10/minute | IP |
| `/auth/refresh` | 20/minute | Token |
| Public endpoints | 100/minute | IP |
| Authenticated endpoints | 1000/minute | User |

## Tài liệu liên quan

- [API Overview](README.md)
- [Response Contract](response-contract.md)
- [Swagger & Postman](swagger-postman.md)
