# Implementation Guide - MusicGPT Backend

This document provides a comprehensive guide to understanding and explaining the implementation of the MusicGPT backend system.

## 🎯 Project Overview

The MusicGPT backend is a **production-ready, scalable backend system** built with **NestJS** following **Clean Architecture** and **SOLID principles**. It demonstrates senior-level architectural thinking with clear separation of concerns, dependency injection, and maintainable code structure.

---

## 📐 Architecture Explanation

### Clean Architecture Layers

The project is organized into **4 distinct layers**:

#### 1. **Domain Layer** (`src/domain/`)
- **Purpose**: Core business logic, independent of frameworks
- **Contains**:
  - **Entities**: Business objects (User, Prompt, Audio)
  - **Repository Interfaces**: Contracts for data access
- **Key Point**: No dependencies on external libraries (except TypeScript types)
- **Example**: `User` entity with `isPaid()` method encapsulates business logic

#### 2. **Application Layer** (`src/application/`)
- **Purpose**: Use cases and business orchestration
- **Contains**:
  - **Services**: Business logic services (AuthService, UserService, etc.)
  - **DTOs**: Data Transfer Objects for API contracts
- **Key Point**: Depends only on domain layer interfaces
- **Example**: `AuthService` orchestrates user registration, login, token generation

#### 3. **Infrastructure Layer** (`src/infrastructure/`)
- **Purpose**: External dependencies and technical implementations
- **Contains**:
  - **Repositories**: Prisma implementations of domain interfaces
  - **Cache**: Redis cache service
  - **Queue**: BullMQ job queue
  - **Rate Limiter**: Redis-based rate limiting
  - **WebSocket**: Socket.IO implementation
  - **Cron**: Scheduled tasks
- **Key Point**: Implements domain interfaces, handles technical concerns
- **Example**: `PrismaUserRepository` implements `IUserRepository` interface

#### 4. **Presentation Layer** (`src/presentation/`)
- **Purpose**: HTTP/WebSocket handling, request/response transformation
- **Contains**:
  - **Controllers**: REST endpoints
  - **Guards**: Authentication/authorization
  - **Interceptors**: Cross-cutting concerns (rate limiting)
  - **Gateways**: WebSocket handlers
  - **Strategies**: Passport authentication strategies
- **Key Point**: Depends on application layer, handles HTTP concerns
- **Example**: `AuthController` exposes `/auth/login` endpoint

### Dependency Flow

```
Presentation → Application → Domain ← Infrastructure
```

**Key Principle**: Dependencies point inward. Outer layers depend on inner layers, but not vice versa.

---

## 🔧 SOLID Principles Implementation

### 1. Single Responsibility Principle (SRP)

Each class has one clear responsibility:

- **AuthService**: Handles authentication logic only
- **UserService**: Handles user business logic only
- **PrismaUserRepository**: Handles user data access only
- **RateLimitInterceptor**: Handles rate limiting only

### 2. Open/Closed Principle (OCP)

- **Repository Interfaces**: Can swap Prisma for TypeORM without changing application layer
- **Service Interfaces**: Can swap Redis cache for Memcached without changing services
- **Example**: `ICacheService` interface allows different cache implementations

### 3. Liskov Substitution Principle (LSP)

- Repository implementations are interchangeable
- `PrismaUserRepository` can be replaced with `TypeORMUserRepository` if both implement `IUserRepository`

### 4. Interface Segregation Principle (ISP)

- Small, focused interfaces:
  - `ICacheService`: Only cache operations
  - `IRateLimiterService`: Only rate limiting
  - `IJobQueueService`: Only job queue operations
- Clients depend only on what they need

### 5. Dependency Inversion Principle (DIP)

- **High-level modules** (services) depend on **abstractions** (interfaces)
- **Low-level modules** (implementations) implement abstractions
- **Dependency Injection**: NestJS injects implementations via tokens

**Example**:
```typescript
// Service depends on interface (abstraction)
constructor(@Inject('IUserRepository') private userRepository: IUserRepository) {}

// Module provides implementation
{ provide: 'IUserRepository', useClass: PrismaUserRepository }
```

---

## 🔐 Authentication Flow

### Registration/Login Flow

1. **User Registration** (`POST /auth/register`)
   ```
   Client → AuthController → AuthService
   - Hash password (bcrypt)
   - Create user in database
   - Generate tokens (Access + Refresh)
   - Store refresh token in database
   - Return tokens to client
   ```

2. **User Login** (`POST /auth/login`)
   ```
   Client → AuthController → AuthService
   - Validate credentials
   - Generate tokens
   - Store refresh token
   - Return tokens
   ```

3. **Token Generation**
   - **Access Token**: JWT, signed with secret, 15min expiry
   - **Refresh Token**: UUID, stored in DB, 7 days expiry

### Token Refresh Flow

```
1. Client sends refresh token to /auth/refresh
2. AuthService validates refresh token:
   - Check if token exists in DB
   - Check if not revoked
   - Check if not expired
3. If valid:
   - Revoke old refresh token (token rotation)
   - Generate new access + refresh tokens
   - Return new tokens
4. If invalid:
   - Return 401 Unauthorized
```

### Token Invalidation Strategy

**Method**: Database-backed token rotation

1. **Refresh Token Storage**
   - Stored in `refresh_tokens` table
   - Fields: `id`, `userId`, `token`, `expiresAt`, `revokedAt`

2. **Invalidation Methods**
   - **Logout**: Set `revokedAt` timestamp
   - **Refresh**: Revoke old token, create new one
   - **Expired**: Tokens expire based on `expiresAt`

3. **Security Benefits**
   - Immediate revocation capability
   - Prevents token reuse
   - Audit trail via database

---

## ⚙️ Job Queue Processing Flow

### Complete Flow

```
1. User creates prompt
   POST /prompts
   ↓
2. PromptService.create()
   - Creates prompt with status = "PENDING"
   - Enqueues job with priority:
     * PAID users: priority = 10
     * FREE users: priority = 1
   ↓
3. Cron Scheduler (every 30 seconds)
   PromptSchedulerService.scanAndEnqueuePendingPrompts()
   - Scans for PENDING prompts
   - Enqueues them (if not already enqueued)
   - Assigns priority based on user subscription
   ↓
4. Worker Service
   Worker.processJobs()
   - BullMQ processes jobs by priority
   - Higher priority (PAID) processed first
   ↓
5. PromptProcessorService.processPrompt()
   - Updates status to "PROCESSING"
   - Simulates generation (2-5s delay)
   - Creates Audio entry
   - Updates status to "COMPLETED"
   - Sends WebSocket notification
```

### Priority Queue

- **BullMQ** processes jobs by priority
- **PAID users**: Priority 10 (processed first)
- **FREE users**: Priority 1 (processed after paid)
- **Result**: Paid users get faster processing

### Retry Mechanism

- **Attempts**: 3 retries
- **Backoff**: Exponential (2s, 4s, 8s)
- **Failed jobs**: Logged for monitoring

---

## ⏰ Cron Scheduler

### Implementation

- **Library**: `@nestjs/schedule`
- **Schedule**: Every 30 seconds (`*/30 * * * * *`)
- **Service**: `PromptSchedulerService`

### Process

```typescript
@Cron('*/30 * * * * *')
async scanAndEnqueuePendingPrompts() {
  1. Find PENDING prompts (limit 50)
  2. For each prompt:
     - Get user subscription status
     - Calculate priority (PAID=10, FREE=1)
     - Enqueue job with priority
  3. Log results
}
```

### Configuration

- Configurable via `CRON_SCAN_INTERVAL` environment variable
- Default: Every 30 seconds

---

## 💾 Cache Strategy

### Implementation

- **Technology**: Redis
- **TTL**: 60 seconds (configurable)
- **Service**: `RedisCacheService`

### Cache Keys

- User: `user:{id}`
- Users list: `users:page:{page}:limit:{limit}`
- Audio: `audio:{id}`
- Audio list: `audios:page:{page}:limit:{limit}`

### Invalidation

1. **On Update**:
   - Delete specific item cache
   - Delete pattern: `users:page:*` or `audios:page:*`

2. **Automatic**:
   - TTL-based expiration (60s)

### Benefits

- Reduces database load
- Faster response times
- Automatic cleanup

---

## 🚦 Rate Limiting

### Implementation

- **Technology**: Redis sliding window
- **Service**: `RedisRateLimiterService`
- **Interceptor**: `RateLimitInterceptor`

### Limits

- **FREE tier**: 20 requests/minute
- **PAID tier**: 100 requests/minute

### Mechanism

```typescript
1. Check user subscription status
2. Determine limit (FREE or PAID)
3. Redis INCR on key: rate_limit:user:{userId}
4. Set TTL to 60 seconds (first request)
5. If count > limit: Return 429 Too Many Requests
6. If count <= limit: Allow request
```

### Configuration

- `RATE_LIMIT_FREE_TIER`: 20
- `RATE_LIMIT_PAID_TIER`: 100
- Window: 60 seconds (1 minute)

---

## 🔍 Unified Search

### Implementation

- **Endpoint**: `GET /search?q={query}`
- **Service**: `SearchService`
- **Scope**: Users (email, displayName) + Audio (title)

### Ranking Algorithm

```typescript
Score Calculation:
- Exact match: 3 points
- Partial match: 2 points
- No match: 0 points

Ranking:
1. Sort by score (descending)
2. Exact matches first
3. Then partial matches
```

### Pagination

- **Type**: Cursor-based
- **Cursor**: Record ID
- **Limit**: 10 per entity type (default)
- **Response**: Includes `nextCursor` for next page

### Example

```
Query: "john"
Results:
1. User: "john@example.com" (exact match, score: 3)
2. User: "johnny" (partial match, score: 2)
3. Audio: "John's Song" (partial match, score: 2)
```

---

## 💳 Subscription System

### Tiers

#### FREE Tier
- Rate limit: 20 requests/minute
- Job priority: 1 (lower)
- Standard processing

#### PAID Tier
- Rate limit: 100 requests/minute
- Job priority: 10 (higher)
- Faster processing

### Implementation

1. **Subscription Status**: Stored in `User.subscriptionStatus`
2. **Rate Limiting**: Checked dynamically in `RateLimitInterceptor`
3. **Job Priority**: Assigned when enqueueing in `PromptService`

### Endpoints

- `POST /subscription/subscribe`: Upgrade to PAID
- `POST /subscription/cancel`: Downgrade to FREE

---

## 🔌 WebSocket Notifications

### Implementation

- **Library**: Socket.IO
- **Gateway**: `NotificationsGateway`
- **Namespace**: `/notifications`

### Flow

```
1. Client connects to /notifications namespace
2. Client joins room: user:{userId}
3. When prompt completes:
   - Worker calls WebSocketService.emitToUser()
   - Message sent to room: user:{userId}
   - Client receives: prompt:completed event
```

### Events

- **prompt:completed**: Sent when prompt processing completes
  - Payload: `{ promptId, audioId, message }`

---

## 📦 Dependency Injection

### How It Works

1. **Interfaces Defined**: In domain/shared layers
2. **Implementations**: In infrastructure layer
3. **Providers**: Registered in `AppModule`
4. **Injection**: Via `@Inject()` decorator with token

### Example

```typescript
// Interface (domain)
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
}

// Implementation (infrastructure)
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  // ...
}

// Provider (app.module.ts)
{
  provide: 'IUserRepository',
  useClass: PrismaUserRepository,
}

// Usage (service)
constructor(@Inject('IUserRepository') private userRepo: IUserRepository) {}
```

---

## 🗄️ Database Schema

### Models

1. **User**
   - id, email, password, displayName
   - subscriptionStatus (FREE | PAID)
   - timestamps

2. **Prompt**
   - id, userId, text, status
   - status: PENDING | PROCESSING | COMPLETED
   - timestamps

3. **Audio**
   - id, promptId, userId, title, url
   - timestamps

4. **RefreshToken**
   - id, userId, token, expiresAt
   - revokedAt (nullable)

### Relationships

- User → Prompts (1:N)
- User → Audios (1:N)
- User → RefreshTokens (1:N)
- Prompt → Audio (1:1)

---

## 🚀 How to Explain This Project

### To Technical Interviewers

1. **Start with Architecture**
   - "This project follows Clean Architecture with 4 layers..."
   - "Dependencies point inward, ensuring testability..."

2. **Highlight SOLID Principles**
   - "Each service has a single responsibility..."
   - "We use dependency injection to follow DIP..."

3. **Explain Key Features**
   - Authentication with token rotation
   - Priority-based job processing
   - Dynamic rate limiting
   - Real-time notifications

4. **Show Production Readiness**
   - Docker containerization
   - Error handling
   - Caching strategy
   - Scalability considerations

### To Non-Technical Stakeholders

1. **Business Value**
   - "Users can generate audio from prompts..."
   - "Paid users get faster processing..."
   - "System scales with Docker..."

2. **Key Features**
   - User authentication
   - Subscription management
   - Background processing
   - Real-time notifications

3. **Technical Highlights**
   - Clean, maintainable code
   - Production-ready architecture
   - Comprehensive documentation

---

## 📝 Key Files to Review

### Architecture
- `src/app.module.ts`: Dependency injection setup
- `src/domain/`: Core business logic
- `src/application/services/`: Business orchestration

### Features
- `src/presentation/controllers/auth.controller.ts`: Authentication
- `src/infrastructure/cron/prompt-scheduler.service.ts`: Cron job
- `src/worker/main.ts`: Background worker
- `src/presentation/gateways/notifications.gateway.ts`: WebSocket

### Configuration
- `docker-compose.yml`: Service orchestration
- `.env.example`: Environment variables
- `prisma/schema.prisma`: Database schema

---

## ✅ Checklist for Explanation

When explaining this project, cover:

- [x] Clean Architecture layers
- [x] SOLID principles
- [x] Authentication flow
- [x] Token rotation strategy
- [x] Job queue processing
- [x] Cron scheduler
- [x] Cache strategy
- [x] Rate limiting
- [x] Search ranking
- [x] Subscription perks
- [x] WebSocket notifications
- [x] Dependency injection
- [x] Docker setup

---

## 🎓 Learning Points

This implementation demonstrates:

1. **Senior-level architecture**: Clean separation, maintainability
2. **Production readiness**: Error handling, scalability, monitoring
3. **Best practices**: SOLID, dependency injection, interfaces
4. **Modern stack**: NestJS, Prisma, Redis, BullMQ, Socket.IO
5. **Documentation**: Comprehensive README, Swagger, code comments

---

This guide should help you explain the implementation to others, whether they're technical or non-technical stakeholders.
