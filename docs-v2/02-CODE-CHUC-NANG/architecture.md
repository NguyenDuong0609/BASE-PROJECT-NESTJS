# Kiến trúc hệ thống

Mô tả chi tiết kiến trúc hệ thống, các thành phần và cách chúng tương tác.

## Tổng quan kiến trúc

Hệ thống theo kiến trúc **Clean Architecture** với 4 tầng chính:

1. **Presentation Layer** - HTTP API
2. **Application Layer** - Business logic
3. **Domain Layer** - Core entities
4. **Infrastructure Layer** - External services

## Sơ đồ kiến trúc

```mermaid
graph TB
    subgraph "Client"
        Web[Web App]
        Mobile[Mobile App]
    end
    
    subgraph "API Gateway / Reverse Proxy"
        Nginx[Nginx / Traefik]
    end
    
    subgraph "Application"
        API[NestJS API]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL)]
        Redis[(Redis)]
    end
    
    subgraph "External Services"
        S3[AWS S3]
        SMTP[SMTP Server]
        Google[Google OAuth]
    end
    
    subgraph "Observability"
        Prometheus[Prometheus]
        Grafana[Grafana]
        Loki[Loki]
    end
    
    Web --> Nginx
    Mobile --> Nginx
    Nginx --> API
    
    API --> PG
    API --> Redis
    API --> S3
    API --> SMTP
    API --> Google
    
    API --> Prometheus
    API --> Loki
    
    Prometheus --> Grafana
    Loki --> Grafana
    
    style API fill:#e1f5ff
    style PG fill:#f0ffe1
    style Redis fill:#ffe1f5
```

## Clean Architecture Layers

### Layer 1: Presentation Layer

**Thành phần:**
- Controllers
- DTOs (Data Transfer Objects)
- Guards (Authentication & Authorization)
- Interceptors
- Pipes (Validation)

**Trách nhiệm:**
- Tiếp nhận HTTP requests
- Validate input data
- Authentication & authorization
- Transform request/response
- API documentation (Swagger)

**Flow:**
```
HTTP Request → Middleware → Guards → Pipes → Controller → Service
```

### Layer 2: Application Layer

**Thành phần:**
- Services
- Use Cases
- Domain Events

**Trách nhiệm:**
- Business logic
- Workflow orchestration
- Transaction management
- External service integration
- Domain event handling

**Flow:**
```
Controller → Service → Repository → Database
              → External Service
              → Queue
```

### Layer 3: Domain Layer

**Thành phần:**
- Entities
- Value Objects
- Domain Services
- Repository Interfaces

**Trách nhiệm:**
- Core business rules
- Entity relationships
- Domain invariants
- Repository contracts

**Đặc điểm:**
- Không phụ thuộc framework
- Không phụ thuộc infrastructure
- Testable đơn giản

### Layer 4: Infrastructure Layer

**Thành phần:**
- Repository Implementations
- Database (PostgreSQL)
- Cache (Redis)
- Storage (AWS S3)
- Queue (BullMQ)
- External APIs

**Trách nhiệm:**
- Data persistence
- External service integration
- Caching
- File storage
- Background jobs

## Module Architecture

### Module Dependencies

```mermaid
graph LR
    App[App Module]
    
    App --> Auth[Auth Module]
    App --> Users[Users Module]
    App --> UserRoles[User Roles Module]
    App --> Media[Media Module]
    App --> Queue[Queue Module]
    App --> Comments[Comments Module]
    App --> Checkin[Checkin Module]
    App --> FlashCards[Flash Cards Module]
    App --> FlashCardsState[Flash Cards State Module]
    App --> Collections[Collections Module]
    App --> Topics[Topics Module]
    
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
    
    Queue -.-> Media
    Queue -.-> Auth
    
    style App fill:#ff9999
    style Auth fill:#99ccff
    style Users fill:#99ff99
    style Queue fill:#ffcc99
```

### Module Categories

**Core Modules (Bắt buộc):**
- `auth` - Authentication & authorization
- `users` - User management
- `user-roles` - Role-based access control

**Feature Modules (Tùy chọn):**
- `media` - File upload & storage
- `queue` - Background jobs
- `comments` - Hierarchical comments
- `checkin` - Daily check-in
- `flash-cards` - Flash card CRUD
- `flash-cards-state` - State machine
- `collections` - Collections
- `topics` - Topics

## Request Flow

### HTTP Request Lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant Middleware
    participant Guards
    participant Controller
    participant Service
    participant Repository
    participant Database
    
    Client->>Middleware: HTTP Request
    Middleware->>Middleware: Logging, CORS, Body parsing
    Middleware->>Guards: Auth check
    Guards->>Guards: JWT validation, Role check
    Guards->>Controller: Authorized
    Controller->>Controller: DTO validation
    Controller->>Service: Business logic
    Service->>Repository: Data access
    Repository->>Database: SQL query
    Database-->>Repository: Result
    Repository-->>Service: Entity
    Service-->>Controller: Processed data
    Controller-->>Client: HTTP Response
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant UsersService
    participant Database
    participant JWT
    
    Client->>AuthController: POST /auth/sign-in
    AuthController->>AuthService: signIn(dto)
    AuthService->>UsersService: findByEmail(email)
    UsersService->>Database: SELECT * FROM users
    Database-->>UsersService: User entity
    UsersService-->>AuthService: User with password
    AuthService->>AuthService: Verify password
    AuthService->>JWT: Generate tokens
    JWT-->>AuthService: access_token, refresh_token
    AuthService->>AuthController: Tokens
    AuthController-->>Client: 200 OK + tokens
```

### File Upload Flow

```mermaid
sequenceDiagram
    participant Client
    participant MediaController
    participant MediaService
    participant S3Service
    participant S3
    participant Database
    
    Client->>MediaController: POST /media/upload (file)
    MediaController->>MediaController: Validate file
    MediaController->>MediaService: upload(file)
    MediaService->>MediaService: Generate S3 key
    MediaService->>S3Service: uploadToS3(file, key)
    S3Service->>S3: PUT object
    S3-->>S3Service: Success
    S3Service-->>MediaService: S3 URL
    MediaService->>Database: INSERT media_files
    Database-->>MediaService: MediaFile entity
    MediaService-->>MediaController: Metadata
    MediaController-->>Client: 201 Created
```

## Database Architecture

### Schema Overview

```mermaid
erDiagram
    users ||--o{ flash_cards : creates
    users ||--o{ collections : creates
    users ||--o{ comments : writes
    users ||--o{ media_files : uploads
    users }o--|| user_roles : has
    
    flash_cards }o--|| topics : belongs_to
    flash_cards ||--|| flash_card_states : has
    
    collections ||--o{ flash_cards : contains
    
    comments ||--o{ comment_closure : "parent/child"
    comments }o--|| comments : replies_to
```

### Indexing Strategy

**Critical indexes:**
- `users.email` (unique)
- `users.username` (unique)
- `comments.post_id`
- `comments.author_id`
- `comment_closure.ancestor_id`
- `comment_closure.descendant_id`
- `media_files.uploaded_by`
- `media_files.status`

## Security Architecture

### Authentication Layers

1. **Transport Layer** - HTTPS/TLS
2. **Application Layer** - JWT + Refresh token
3. **API Layer** - Guards + Roles
4. **Resource Layer** - Ownership checks

### Authorization Flow

```
Request → Public Check → JWT Validation → Role Check → Resource Ownership → Access
          (404 if off)  (401 if fail)    (403 if fail)   (403 if fail)
```

## Scalability Architecture

### Horizontal Scaling

```mermaid
graph LR
    LB[Load Balancer]
    API1[API Instance 1]
    API2[API Instance 2]
    API3[API Instance 3]
    PG[(PostgreSQL)]
    Redis[(Redis)]
    
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> PG
    API2 --> PG
    API3 --> PG
    
    API1 --> Redis
    API2 --> Redis
    API3 --> Redis
    
    style LB fill:#ff9999
    style PG fill:#f0ffe1
    style Redis fill:#ffe1f5
```

### Stateless Design

- JWT stateless authentication
- Session data in Redis
- File storage in S3
- Background jobs in queue

## Performance Considerations

### Database

- Connection pooling
- Query optimization
- Index usage
- N+1 query prevention

### Caching

- Redis for session data
- Application cache for frequent queries
- CDN for static assets

### Queue

- Async processing for heavy tasks
- Rate limiting
- Job retry with backoff

## Tài liệu liên quan

- [Module Structure](module-structure.md)
- [Design Patterns](design-patterns.md)
- [Database Schema](../05-CAU-HINH/)
