# MusicGPT Backend - Production-Ready Backend System

A scalable, production-ready backend system built with NestJS, implementing clean architecture principles, SOLID design patterns, and comprehensive features including authentication, subscription management, background job processing, WebSockets, and more.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Docker Setup](#docker-setup)
  - [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Architecture Details](#architecture-details)
  - [Clean Architecture](#clean-architecture)
  - [SOLID Principles](#solid-principles)
  - [Authentication Flow](#authentication-flow)
  - [Token Rotation & Invalidation Strategy](#token-rotation--invalidation-strategy)
  - [Job Queue Processing Flow](#job-queue-processing-flow)
  - [Cron Scheduler](#cron-scheduler)
  - [Cache Strategy](#cache-strategy)
  - [Rate Limiting](#rate-limiting)
  - [Unified Search Ranking](#unified-search-ranking)
  - [Subscription Perks](#subscription-perks)
- [C4 Architecture Diagrams](#c4-architecture-diagrams)
- [API Endpoints](#api-endpoints)
- [Testing](#-testing)
  - [Running Tests](#running-tests)
  - [Test Structure](#test-structure)
  - [Test Coverage](#test-coverage)
  - [Load Testing](#load-testing)
  - [Docker Health Checks](#docker-health-checks)
- [Deployment](#-deployment)

---

## 🏗️ Architecture Overview

This project follows **Clean Architecture** principles with clear separation of concerns:

- **Domain Layer**: Core business entities and repository interfaces
- **Application Layer**: Use cases and business logic (services)
- **Infrastructure Layer**: External dependencies (database, cache, queue, WebSocket)
- **Presentation Layer**: Controllers, guards, interceptors, gateways

The architecture ensures:
- ✅ Testability: Each layer can be tested independently
- ✅ Maintainability: Clear boundaries and responsibilities
- ✅ Scalability: Easy to add new features or swap implementations
- ✅ SOLID Principles: Single Responsibility, Dependency Inversion, etc.

---

## ✨ Features

### Core Features

- ✅ **Authentication & Authorization**
  - JWT Access Tokens (15 minutes)
  - Refresh Tokens (7 days)
  - Token rotation on refresh
  - Secure token storage and invalidation

- ✅ **Subscription System**
  - FREE and PAID tiers
  - Dynamic rate limiting based on subscription
  - Priority job processing for paid users

- ✅ **Dynamic Rate Limiting**
  - Redis-backed rate limiting
  - FREE: 20 requests/minute
  - PAID: 100 requests/minute

- ✅ **Unified Search**
  - Search across Users and Audio
  - Cursor-based pagination
  - Weighted ranking (exact match > partial match)

- ✅ **CRUD Operations**
  - Paginated endpoints
  - Redis caching (60s TTL)
  - Automatic cache invalidation on updates
  - Bearer token authentication required
  - User-specific data access (users can only access their own resources)

- ✅ **Background Job Processing**
  - BullMQ job queue
  - Priority-based processing (PAID > FREE)
  - Retry mechanism with exponential backoff

- ✅ **Cron Scheduler**
  - Scans for pending prompts every 30 seconds
  - Enqueues jobs with priority based on subscription

- ✅ **WebSocket Notifications**
  - Real-time notifications for prompt completion
  - User-specific channels

- ✅ **Swagger Documentation**
  - Complete API documentation
  - Interactive testing interface

---

## 🛠️ Tech Stack

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL 15 (Prisma ORM)
- **Cache & Queue**: Redis 7
- **Job Queue**: BullMQ
- **WebSocket**: Socket.IO
- **Authentication**: JWT (passport-jwt)
- **Documentation**: Swagger/OpenAPI
- **Scheduling**: @nestjs/schedule
- **Validation**: class-validator, class-transformer
- **Containerization**: Docker & Docker Compose

---

## 📁 Project Structure

```
src/
├── application/          # Application Layer (Use Cases)
│   ├── dto/             # Data Transfer Objects
│   └── services/       # Business Logic Services
├── domain/            # Domain Layer (Core Business Logic)
│   ├── entities/       # Domain Entities
│   └── repositories/   # Repository Interfaces
├── infrastructure/     # Infrastructure Layer
│   ├── cache/          # Redis Cache Implementation
│   ├── cron/           # Cron Schedulers
│   ├── database/       # Prisma Service
│   ├── job-queue/      # BullMQ Implementation
│   ├── rate-limiter/   # Rate Limiting Implementation
│   ├── repositories/   # Prisma Repository Implementations
│   └── websocket/      # WebSocket Implementation
├── presentation/        # Presentation Layer
│   ├── controllers/    # REST Controllers
│   ├── decorators/     # Custom Decorators
│   ├── gateways/       # WebSocket Gateways
│   ├── guards/         # Authentication Guards
│   ├── interceptors/   # Rate Limiting Interceptor
│   └── strategies/     # Passport Strategies
├── shared/              # Shared Interfaces
│   └── interfaces/     # Service Interfaces
├── config/              # Configuration
├── worker/              # Background Worker
├── app.module.ts       # Root Module
└── main.ts             # Application Bootstrap
```

---

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- npm or yarn

### Docker Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd musicpt
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database
   - Redis cache
   - API server (port 3000)
   - Worker service

4. **Run database migrations**
   ```bash
   docker-compose exec api npx prisma migrate deploy
   ```

5. **Access the application**
   - API: http://localhost:3000
   - Swagger: http://localhost:3000/docs

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Update DATABASE_URL and REDIS_HOST to point to local services
   ```

3. **Start PostgreSQL and Redis** (using Docker or locally)
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Run migrations**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start the API server**
   ```bash
   npm run start:dev
   ```

6. **Start the worker** (in a separate terminal)
   ```bash
   npm run build
   npm run worker
   ```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://musicpt_user:musicpt_password@localhost:5432/musicpt_db?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Rate Limiting
RATE_LIMIT_FREE_TIER=20
RATE_LIMIT_PAID_TIER=100
RATE_LIMIT_WINDOW_MS=300000

# Cache
CACHE_TTL=60

# Queue
QUEUE_NAME=prompt-processing
QUEUE_CONCURRENCY=5

# Cron
CRON_SCAN_INTERVAL=*/30 * * * * *
```

---

## 📚 API Documentation

Swagger documentation is available at `/docs` when the server is running.

**Access**: http://localhost:3000/docs

The documentation includes:
- All endpoints with request/response schemas
- Authentication requirements
- Pagination parameters
- Error responses
- Subscription tier information
- Prompt lifecycle documentation

---

## 🏛️ Architecture Details

### Clean Architecture

The project follows Clean Architecture with four main layers:

1. **Domain Layer** (`domain/`)
   - Pure business logic
   - No dependencies on external frameworks
   - Entities and repository interfaces

2. **Application Layer** (`application/`)
   - Use cases and business logic
   - Depends only on domain layer
   - Services orchestrate business operations

3. **Infrastructure Layer** (`infrastructure/`)
   - External dependencies (database, cache, queue)
   - Implements domain interfaces
   - Handles technical concerns

4. **Presentation Layer** (`presentation/`)
   - Controllers, guards, interceptors
   - HTTP/WebSocket handling
   - Depends on application layer

**Dependency Flow**: Presentation → Application → Domain ← Infrastructure

### SOLID Principles

1. **Single Responsibility Principle (SRP)**
   - Each service has one clear responsibility
   - Controllers handle HTTP, services handle business logic

2. **Open/Closed Principle (OCP)**
   - Repository interfaces allow swapping implementations
   - Easy to extend without modifying existing code

3. **Liskov Substitution Principle (LSP)**
   - Repository implementations are interchangeable
   - Can swap Prisma for TypeORM without changing application layer

4. **Interface Segregation Principle (ISP)**
   - Small, focused interfaces (ICacheService, IRateLimiterService)
   - Clients depend only on what they need

5. **Dependency Inversion Principle (DIP)**
   - High-level modules depend on abstractions (interfaces)
   - Dependency injection via NestJS

### Authentication Flow

#### Registration Flow

```
┌─────────┐                    ┌──────────┐                    ┌──────────┐
│ Client  │                    │   API    │                    │ Database │
└────┬────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │ POST /auth/register           │                               │
     │ {email, password, name}       │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │                               │ Hash password (bcrypt)        │
     │                               │                               │
     │                               │ Create user                   │
     │                               ├──────────────────────────────>│
     │                               │<──────────────────────────────┤
     │                               │                               │
     │                               │ Generate tokens:              │
     │                               │ - Access Token (JWT, 15min)   │
     │                               │ - Refresh Token (UUID)        │
     │                               │                               │
     │                               │ Store refresh token           │
     │                               ├──────────────────────────────>│
     │                               │<──────────────────────────────┤
     │                               │                               │
     │ {accessToken, refreshToken,   │                               │
     │  user: {...}}                 │                               │
     │<───────────────────────────────┤                               │
     │                               │                               │
```

#### Login Flow

```
┌─────────┐                    ┌──────────┐                    ┌──────────┐
│ Client  │                    │   API    │                    │ Database │
└────┬────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │ POST /auth/login              │                               │
     │ {email, password}              │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │                               │ Find user by email             │
     │                               ├──────────────────────────────>│
     │                               │<──────────────────────────────┤
     │                               │                               │
     │                               │ Verify password (bcrypt)      │
     │                               │                               │
     │                               │ Generate tokens                │
     │                               │ Store refresh token            │
     │                               ├──────────────────────────────>│
     │                               │<──────────────────────────────┤
     │                               │                               │
     │ {accessToken, refreshToken,   │                               │
     │  user: {...}}                 │                               │
     │<───────────────────────────────┤                               │
     │                               │                               │
```

#### Token Refresh Flow (Token Rotation)

```
┌─────────┐                    ┌──────────┐                    ┌──────────┐
│ Client  │                    │   API    │                    │ Database │
└────┬────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │ Access Token expired          │                               │
     │                               │                               │
     │ POST /auth/refresh            │                               │
     │ {refreshToken: "uuid-..."}    │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │                               │ Validate refresh token        │
     │                               │ - Check exists                │
     │                               │ - Check not revoked            │
     │                               │ - Check not expired            │
     │                               ├──────────────────────────────>│
     │                               │<──────────────────────────────┤
     │                               │                               │
     │                               │ Revoke old token              │
     │                               │ (set revokedAt = now)         │
     │                               ├──────────────────────────────>│
     │                               │<──────────────────────────────┤
     │                               │                               │
     │                               │ Generate new tokens            │
     │                               │ Store new refresh token        │
     │                               ├──────────────────────────────>│
     │                               │<──────────────────────────────┤
     │                               │                               │
     │ {accessToken, refreshToken,   │                               │
     │  username}                    │                               │
     │<───────────────────────────────┤                               │
     │                               │                               │
```

#### API Request Flow (With Bearer Token)

```
┌─────────┐                    ┌──────────┐                    ┌──────────┐
│ Client  │                    │   API    │                    │ Database │
└────┬────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │ GET /prompts                  │                               │
     │ Authorization: Bearer {token}  │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │                               │ JWT Guard validates token      │
     │                               │ - Extract user from payload    │
     │                               │ - Attach to request.user       │
     │                               │                               │
     │                               │ Rate Limit Interceptor         │
     │                               │ - Check user subscription      │
     │                               │ - Check rate limit             │
     │                               │                               │
     │                               │ Controller → Service            │
     │                               │ - Get user prompts             │
     │                               ├──────────────────────────────>│
     │                               │<──────────────────────────────┤
     │                               │                               │
     │ [{prompt1}, {prompt2}, ...]   │                               │
     │<───────────────────────────────┤                               │
     │                               │                               │
```

**Key Points**:
- **Access Token**: JWT signed with secret, expires in 15 minutes
- **Refresh Token**: UUID stored in database, expires in 7 days
- **Token Rotation**: Old refresh token revoked when new one is issued
- **Password Validation**: Minimum 8 characters, 1 number, 1 uppercase, 1 lowercase
- **Bearer Token**: Required for all protected endpoints (except `/auth/register`, `/auth/login`, `/auth/refresh`)

### Token Rotation & Invalidation Strategy

**Strategy**: Token Rotation with Database Blacklisting

1. **Refresh Token Storage**
   - Stored in PostgreSQL `refresh_tokens` table
   - Includes: token (UUID), userId, expiresAt, revokedAt

2. **Token Rotation**
   - On refresh, old token is revoked (revokedAt set)
   - New refresh token is generated
   - Prevents token reuse attacks

3. **Invalidation Methods**
   - Logout: Sets revokedAt timestamp
   - Refresh: Revokes old token, creates new one
   - Expired tokens: Cleaned up by cron job (optional)

4. **Security Benefits**
   - Can revoke tokens immediately
   - Prevents token reuse
   - Audit trail via database

### Job Queue Processing Flow

#### Complete Flow Diagram

```
┌─────────┐                    ┌──────────┐                    ┌──────────┐                    ┌──────────┐
│ Client │                    │   API    │                    │  Cron    │                    │  Worker  │
└────┬────┘                    └────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │                               │
     │ POST /prompts                 │                               │                               │
     │ {text: "Generate song..."}    │                               │                               │
     ├──────────────────────────────>│                               │                               │
     │                               │                               │                               │
     │                               │ Create prompt                 │                               │
     │                               │ status = PENDING              │                               │
     │                               │                               │                               │
     │                               │ Return prompt                 │                               │
     │ {id, text, status: PENDING}   │                               │                               │
     │<──────────────────────────────┤                               │                               │
     │                               │                               │                               │
     │                               │                               │ Every 30 seconds:              │
     │                               │                               │ Scan for PENDING prompts       │
     │                               │                               │                               │
     │                               │                               │ For each prompt:               │
     │                               │                               │ - Get user subscription        │
     │                               │                               │ - priority = PAID ? 10 : 1     │
     │                               │                               │ - Enqueue job (with jobId)     │
     │                               │                               ├───────────────────────────────>│
     │                               │                               │                               │
     │                               │                               │                               │ Worker picks up job
     │                               │                               │                               │ (higher priority first)
     │                               │                               │                               │
     │                               │                               │                               │ Update status = PROCESSING
     │                               │                               │                               │
     │                               │                               │                               │ Simulate generation (2-5s)
     │                               │                               │                               │
     │                               │                               │                               │ Create Audio entry
     │                               │                               │                               │
     │                               │                               │                               │ Update status = COMPLETED
     │                               │                               │                               │
     │                               │                               │                               │ Send WebSocket notification
     │                               │                               │                               │
     │ WebSocket: prompt:completed   │                               │                               │
     │<──────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
     │                               │                               │                               │
```

#### Step-by-Step Process

1. **User Creates Prompt**
   - `POST /prompts` with `{text: "..."}`
   - Prompt created with `status = "PENDING"`
   - **No job enqueued at this point**

2. **Cron Scheduler (Every 30 seconds)**
   - Scans database for prompts with `status = "PENDING"`
   - For each prompt:
     - Fetches user subscription status
     - Determines priority: `PAID = 10`, `FREE = 1`
     - Enqueues job with `jobId = "prompt-{promptId}"` (prevents duplicates)

3. **Worker Picks Up Job**
   - BullMQ processes jobs by priority (higher first)
   - PAID users' prompts processed before FREE users

4. **Job Processing**
   - **Idempotency Check**: If status is `COMPLETED` or `PROCESSING`, skip
   - Update status to `PROCESSING`
   - Simulate audio generation (2-5 second delay)
   - Create `Audio` entry linked to prompt
   - Update status to `COMPLETED`
   - **Error Handling**: On failure, reset status to `PENDING` (will be retried)

5. **WebSocket Notification**
   - Emit `prompt:completed` event to user's channel
   - User receives real-time notification

#### Priority Queue Behavior

- **BullMQ Priority**: Higher numbers = processed first
- **PAID users**: Priority 10 → Processed first
- **FREE users**: Priority 1 → Processed after PAID jobs
- **Fair Processing**: Within same priority, FIFO order

#### Idempotency & Deduplication

- **Job ID**: `"prompt-{promptId}"` prevents duplicate jobs
- **Status Check**: Worker checks status before processing
- **Race Condition Protection**: `PROCESSING` status prevents concurrent processing
- **Retry on Failure**: Failed jobs reset to `PENDING` for retry

#### Error Handling

```typescript
try {
  // Process prompt
  await processPrompt(promptId)
} catch (error) {
  // Reset to PENDING for retry
  await promptRepository.update(promptId, { status: 'PENDING' })
  throw error
}
```

**For detailed prompt processing flow, see**: [PROMPT_PROCESSING_FLOW.md](./PROMPT_PROCESSING_FLOW.md)

### Cron Scheduler

**Implementation**: `@nestjs/schedule` with `@Cron` decorator

#### Schedule Configuration

- **Cron Expression**: `*/30 * * * * *` (every 30 seconds)
- **Configurable**: Via `CRON_SCAN_INTERVAL` environment variable
- **Default**: `*/30 * * * * *`

#### Task Flow

```
Every 30 seconds:
    ↓
CronScheduler.scanAndEnqueue()
    ↓
1. Query database for PENDING prompts
   (limit: 50 per batch)
    ↓
2. For each prompt:
   - Get user subscription status
   - Determine priority:
     * PAID users: priority = 10
     * FREE users: priority = 1
   - Enqueue job with deduplication
     (jobId = "prompt-{promptId}")
    ↓
3. Worker picks up jobs
   (higher priority first)
```

#### Implementation

```typescript
@Injectable()
class PromptSchedulerService {
  @Cron(process.env.CRON_SCAN_INTERVAL || '*/30 * * * * *')
  async scanAndEnqueue() {
    // 1. Find pending prompts (batch of 50)
    pendingPrompts = await promptRepository.findByStatus('PENDING', 50)
    
    // 2. Process each prompt
    for (prompt of pendingPrompts) {
      // 3. Get user to determine priority
      user = await userRepository.findById(prompt.userId)
      priority = user.subscriptionStatus === 'PAID' ? 10 : 1
      
      // 4. Enqueue with deduplication
      await jobQueue.addJob({
        id: `prompt-${prompt.id}`, // Prevents duplicate jobs
        name: 'process-prompt',
        data: { promptId: prompt.id },
        priority // Higher priority = processed first
      })
    }
  }
}
```

#### Key Features

- **Batch Processing**: Processes up to 50 prompts per scan (prevents overload)
- **Priority-based**: PAID users get priority 10, FREE users get priority 1
- **Deduplication**: Uses `jobId` to prevent duplicate job enqueueing
- **Idempotent**: Safe to run multiple times (won't create duplicate jobs)
- **Configurable**: Schedule can be changed via environment variable

#### Why Cron Instead of Immediate Enqueueing?

1. **Decoupling**: Separates prompt creation from job processing
2. **Batching**: More efficient to process multiple prompts together
3. **Priority Control**: Can reassess priorities before enqueueing
4. **Rate Control**: Prevents overwhelming the job queue
5. **Resilience**: If job queue is down, prompts remain PENDING and will be picked up later

### Cache Strategy

**Implementation**: Redis with TTL-based expiration and manual invalidation

#### Cache Keys Pattern

```
Single Item:
  - user:{id}                    → User entity
  - audio:{id}                   → Audio entity
  - prompt:{id}                  → Prompt entity

List/Collection:
  - users:page:{page}:limit:{limit}     → Paginated users
  - audios:page:{page}:limit:{limit}    → Paginated audio
  - prompts:page:{page}:limit:{limit}    → Paginated prompts
```

#### Cache Flow

```
Request → Service → Check Cache
                      ↓
                  Cache Hit?
                      ↓
              Yes ←→ No
              ↓         ↓
         Return      Query DB
         Cached         ↓
         Data      Store in Cache
                      ↓
                  Return Data
```

#### TTL (Time To Live)

- **Default**: 60 seconds (configurable via `CACHE_TTL` env var)
- **Automatic Expiration**: Redis automatically deletes keys after TTL
- **Benefits**: Prevents stale data, automatic cleanup

#### Invalidation Rules

**1. On Create**:
```typescript
// No invalidation needed (new data not in cache yet)
// Cache will be populated on first read
```

**2. On Update**:
```typescript
// Invalidate specific item
await cacheService.delete(`user:${id}`)
await cacheService.delete(`audio:${id}`)

// Invalidate all list caches (pattern-based)
await cacheService.deletePattern('users:page:*')
await cacheService.deletePattern('audios:page:*')
```

**3. On Delete**:
```typescript
// Same as update
await cacheService.delete(`user:${id}`)
await cacheService.deletePattern('users:page:*')
```

**4. Automatic Expiration**:
- Redis automatically removes keys after TTL expires
- No manual cleanup needed

#### Implementation Example

```typescript
class UserService {
  async findById(id: string): Promise<UserResponseDto> {
    // 1. Check cache
    cacheKey = `user:${id}`
    cached = await cacheService.get<UserResponseDto>(cacheKey)
    if (cached) return cached
    
    // 2. Query database
    user = await userRepository.findById(id)
    if (!user) throw NotFoundException('User not found')
    
    // 3. Transform to DTO
    dto = this.toDto(user)
    
    // 4. Store in cache
    await cacheService.set(cacheKey, dto, 60) // 60 seconds TTL
    
    // 5. Return
    return dto
  }
  
  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    // 1. Update in database
    updated = await userRepository.update(id, dto)
    
    // 2. Invalidate cache
    await cacheService.delete(`user:${id}`)
    await cacheService.deletePattern('users:page:*')
    
    // 3. Return updated data
    return this.toDto(updated)
  }
}
```

#### Benefits

- ✅ **Reduces Database Load**: Frequently accessed data served from cache
- ✅ **Faster Response Times**: Redis is much faster than database queries
- ✅ **Automatic Cleanup**: TTL-based expiration prevents stale data
- ✅ **Pattern-based Invalidation**: Efficiently clears related caches
- ✅ **Scalable**: Redis can handle high read throughput

### Rate Limiting

**Implementation**: Redis-based sliding window algorithm

#### Architecture

```
Request → JWT Auth Guard → Rate Limit Interceptor → Controller
                              ↓
                    Redis Rate Limiter
                    (checks user tier)
                              ↓
                    Allow/Reject Request
```

#### Logic Flow

1. **Request Interception**
   - `RateLimitInterceptor` intercepts all authenticated requests
   - Extracts user from JWT token payload
   - Fetches user subscription status from database

2. **Limit Determination**
   - FREE tier: 20 requests/minute
   - PAID tier: 100 requests/minute
   - Based on `user.subscriptionStatus`

3. **Redis Sliding Window**
   - Key: `rate_limit:user:{userId}`
   - Operation: `INCR rate_limit:user:{userId}`
   - TTL: 60 seconds (set on first request)
   - Window: Sliding (resets after 60s of inactivity)

4. **Decision Logic**
   ```typescript
   currentCount = Redis.INCR(key)
   if (currentCount === 1) {
     Redis.PEXPIRE(key, 60000) // Set TTL
   }
   
   if (currentCount > limit) {
     throw 429 Too Many Requests
   } else {
     allow request
   }
   ```

5. **Error Response**
   - Status: `429 Too Many Requests`
   - Body: `{ statusCode: 429, message: "Rate limit exceeded...", limit, windowMs }`

#### Configuration

- `RATE_LIMIT_FREE_TIER`: 20 (default)
- `RATE_LIMIT_PAID_TIER`: 100 (default)
- `RATE_LIMIT_WINDOW_MS`: 60000 (1 minute)

#### Checking Rate Limit Status

Use the endpoint: `GET /users/rate-limit/status` (requires Bearer token)

**Response**:
```json
{
  "remaining": 15,
  "limit": 20,
  "resetAt": "2024-01-15T10:30:00.000Z",
  "windowMs": 60000,
  "subscriptionStatus": "FREE",
  "tier": "FREE"
}
```

**For detailed rate limiting guide, see**: [RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md)

### Unified Search Ranking

**Algorithm**: Weighted scoring with cursor-based pagination

#### Search Flow

```
GET /search?q=john
    ↓
SearchService.search()
    ↓
Parallel Search:
  - UserRepository.search() → Users matching "john"
  - AudioRepository.search() → Audio matching "john"
    ↓
Ranking Algorithm:
  - Calculate score for each result
  - Sort by score (descending)
    ↓
Return ranked results
```

#### Scoring Logic

**For Users**:
- **Exact match on email**: 3 points
- **Partial match on email**: 2 points
- **Exact match on displayName**: 3 points
- **Partial match on displayName**: 2 points
- **Final score**: `Math.max(emailExact, emailPartial, nameExact, namePartial)`

**For Audio**:
- **Exact match on title**: 3 points
- **Partial match on title**: 2 points
- **Final score**: `Math.max(exact, partial)`

#### Ranking Algorithm (Pseudo-code)

```typescript
function rankUsers(users, query) {
  return users.sort((a, b) => {
    // Calculate score for user A
    aEmailExact = a.email.toLowerCase() === query.toLowerCase() ? 3 : 0
    aEmailPartial = a.email.toLowerCase().includes(query.toLowerCase()) ? 2 : 0
    aNameExact = a.displayName.toLowerCase() === query.toLowerCase() ? 3 : 0
    aNamePartial = a.displayName.toLowerCase().includes(query.toLowerCase()) ? 2 : 0
    aScore = Math.max(aEmailExact, aEmailPartial, aNameExact, aNamePartial)
    
    // Calculate score for user B
    bEmailExact = b.email.toLowerCase() === query.toLowerCase() ? 3 : 0
    bEmailPartial = b.email.toLowerCase().includes(query.toLowerCase()) ? 2 : 0
    bNameExact = b.displayName.toLowerCase() === query.toLowerCase() ? 3 : 0
    bNamePartial = b.displayName.toLowerCase().includes(query.toLowerCase()) ? 2 : 0
    bScore = Math.max(bEmailExact, bEmailPartial, bNameExact, bNamePartial)
    
    // Sort descending (highest score first)
    return bScore - aScore
  })
}
```

#### Example

**Query**: `"john"`

**Results** (sorted by score):
1. User: `john@example.com` (exact email match, score: 3)
2. User: `John Doe` (exact name match, score: 3)
3. User: `johnny@example.com` (partial email match, score: 2)
4. Audio: `"John's Song"` (partial title match, score: 2)
5. User: `ajohnson@example.com` (partial email match, score: 2)

#### Pagination

- **Type**: Cursor-based pagination
- **Cursor**: Record ID (string)
- **Limit**: 10 results per entity type (default, configurable)
- **Response**: Includes `nextCursor` for next page

**Example Request**:
```
GET /search?q=john&limit=5
```

**Example Response**:
```json
{
  "users": {
    "data": [...],
    "meta": {
      "nextCursor": "user-id-123"
    }
  },
  "audio": {
    "data": [...],
    "meta": {
      "nextCursor": "audio-id-456"
    }
  }
}
```

#### Search Scope

- **Users**: Searches `email` and `displayName` fields (case-insensitive)
- **Audio**: Searches `title` field (case-insensitive)
- **Case-insensitive**: All comparisons use `.toLowerCase()`

### Subscription Perks Logic

#### Tier Comparison

| Feature | FREE Tier | PAID Tier |
|---------|-----------|-----------|
| **Rate Limit** | 20 requests/minute | 100 requests/minute |
| **Job Priority** | 1 (lower) | 10 (higher) |
| **Processing Speed** | Standard | Faster (priority queue) |
| **Queue Position** | After PAID jobs | First in queue |

#### Implementation Logic

**1. Rate Limiting**:
```typescript
// In RateLimitInterceptor
user = await userRepository.findById(userId)
isPaid = user.subscriptionStatus === 'PAID'
limit = isPaid ? 100 : 20 // PAID: 100/min, FREE: 20/min

// Check limit
allowed = await rateLimiter.checkLimit(`user:${userId}`, limit, 60000)
```

**2. Job Priority**:
```typescript
// In PromptSchedulerService
user = await userRepository.findById(prompt.userId)
priority = user.subscriptionStatus === 'PAID' ? 10 : 1

// Enqueue with priority
await jobQueue.addJob({
  id: `prompt-${prompt.id}`,
  data: { promptId: prompt.id },
  priority // Higher = processed first
})
```

**3. Subscription Management**:
```typescript
// Subscribe to PAID
await subscriptionService.subscribe(userId)
// Updates: user.subscriptionStatus = 'PAID'

// Cancel subscription
await subscriptionService.cancel(userId)
// Updates: user.subscriptionStatus = 'FREE'
```

#### Dynamic Behavior

- **Rate Limits**: Applied dynamically on each request (no restart needed)
- **Job Priority**: Determined at enqueue time (when cron runs)
- **Real-time**: Changes take effect immediately (rate limits) or on next job enqueue (priority)

#### Benefits for PAID Users

1. **5x More API Requests**: 100/min vs 20/min
2. **Faster Prompt Processing**: Higher priority = processed first
3. **Better User Experience**: Less waiting, more throughput

---

## 📊 C4 Architecture Diagrams

### 1. System Context Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    MusicGPT Backend                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   REST API   │  │  WebSocket   │  │   Worker     │ │
│  │   (NestJS)   │  │   Gateway    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼────┐         ┌─────▼─────┐        ┌─────▼─────┐
    │PostgreSQL│        │   Redis   │        │   Redis   │
    │ Database │        │   Cache   │        │ Job Queue │
    └─────────┘         └───────────┘        └───────────┘
```

**Actors**:
- **Users**: Interact via REST API and WebSocket
- **System**: Processes prompts via worker service

**External Systems**:
- PostgreSQL: Data persistence
- Redis: Caching and job queue

### 2. Container Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      MusicGPT System                         │
│                                                              │
│  ┌──────────────────┐      ┌──────────────────┐             │
│  │   API Container  │      │ Worker Container │             │
│  │                  │      │                  │             │
│  │  - REST API      │      │  - Job Processor │             │
│  │  - WebSocket     │      │  - BullMQ Worker│             │
│  │  - Auth          │      │                  │             │
│  │  - Controllers   │      │                  │             │
│  └──────────────────┘      └──────────────────┘             │
│         │                            │                        │
│         └────────────┬───────────────┘                        │
│                      │                                        │
│         ┌────────────▼────────────┐                          │
│         │   Shared Infrastructure  │                          │
│         │                          │                          │
│         │  - PostgreSQL Database   │                          │
│         │  - Redis Cache           │                          │
│         │  - Redis Job Queue       │                          │
│         └──────────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### 3. Component Diagram (API Container)

```
┌─────────────────────────────────────────────────────────────┐
│                    API Container                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Controllers  │  │    Guards      │  │ Interceptors │     │
│  │              │  │                │  │              │     │
│  │ - Auth       │  │ - JwtAuthGuard │  │ - RateLimit  │     │
│  │ - Users      │  │                │  │              │     │
│  │ - Prompts    │  │                │  │              │     │
│  │ - Audio      │  │                │  │              │     │
│  │ - Search     │  │                │  │              │     │
│  └──────┬───────┘  └───────┬────────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐     │
│  │            Application Services                      │     │
│  │                                                      │     │
│  │  - AuthService      - UserService                   │     │
│  │  - PromptService    - AudioService                  │     │
│  │  - SearchService    - SubscriptionService           │     │
│  └──────┬──────────────────────────────────────────────┘     │
│         │                                                     │
│  ┌──────▼──────────────────────────────────────────────┐     │
│  │         Infrastructure Layer                         │     │
│  │                                                      │     │
│  │  - Prisma Repositories  - Redis Cache               │     │
│  │  - Rate Limiter         - Job Queue                 │     │
│  │  - WebSocket Service    - Cron Scheduler           │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 4. Code Structure (Pseudo-code)

#### Authentication Service

```typescript
class AuthService {
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // 1. Check if user exists
    existingUser = await userRepository.findByEmail(dto.email)
    if (existingUser) throw ConflictException('User already exists')
    
    // 2. Validate password complexity
    // - Minimum 8 characters
    // - At least 1 number
    // - At least 1 uppercase letter
    // - At least 1 lowercase letter
    
    // 3. Hash password
    hashedPassword = await bcrypt.hash(dto.password, 10)
    
    // 4. Create user
    user = await userRepository.create({
      email: dto.email,
      password: hashedPassword,
      displayName: dto.displayName,
      subscriptionStatus: 'FREE'
    })
    
    // 5. Generate tokens
    tokens = await generateTokens(user)
    
    // 6. Return response
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        subscriptionStatus: user.subscriptionStatus
      }
    }
  }
  
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // 1. Find user
    user = await userRepository.findByEmail(dto.email)
    if (!user) throw UnauthorizedException('Invalid credentials')
    
    // 2. Verify password
    isValid = await bcrypt.compare(dto.password, user.password)
    if (!isValid) throw UnauthorizedException('Invalid credentials')
    
    // 3. Generate tokens
    tokens = await generateTokens(user)
    
    // 4. Return response
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { ... }
    }
  }
  
  async refresh(refreshToken: string): Promise<RefreshTokenResponseDto> {
    // 1. Validate refresh token
    tokenRecord = await refreshTokenRepository.findByToken(refreshToken)
    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < now) {
      throw UnauthorizedException('Invalid or expired refresh token')
    }
    
    // 2. Get user
    user = await userRepository.findById(tokenRecord.userId)
    if (!user) throw UnauthorizedException('User not found')
    
    // 3. Revoke old token (token rotation)
    await refreshTokenRepository.revokeToken(refreshToken)
    
    // 4. Generate new tokens
    tokens = await generateTokens(user)
    
    // 5. Return response with username
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      username: user.displayName
    }
  }
  
  private async generateTokens(user: User) {
    // Access Token: JWT
    payload = { sub: user.id, email: user.email }
    accessToken = jwt.sign(payload, secret, { expiresIn: '15m' })
    
    // Refresh Token: UUID
    refreshToken = uuidv4()
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    // Store refresh token
    await refreshTokenRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt
    })
    
    return { accessToken, refreshToken }
  }
}
```

#### Prompt Processing Flow

```typescript
class PromptService {
  async create(userId: string, text: string): Promise<PromptResponseDto> {
    // 1. Create prompt with PENDING status
    prompt = await promptRepository.create({
      userId,
      text,
      status: 'PENDING'
    })
    
    // Note: Job is NOT enqueued here
    // Cron scheduler will pick it up
    
    return this.toDto(prompt)
  }
}

class PromptSchedulerService {
  @Cron('*/30 * * * * *') // Every 30 seconds
  async scanAndEnqueue() {
    // 1. Find pending prompts (batch of 50)
    pendingPrompts = await promptRepository.findPending(50)
    
    // 2. For each prompt
    for (prompt of pendingPrompts) {
      // 3. Get user subscription status
      user = await userRepository.findById(prompt.userId)
      priority = user.subscriptionStatus === 'PAID' ? 10 : 1
      
      // 4. Enqueue with deduplication (jobId = prompt.id)
      await jobQueue.addJob({
        id: `prompt-${prompt.id}`, // Prevents duplicates
        name: 'process-prompt',
        data: { promptId: prompt.id },
        priority
      })
    }
  }
}

class PromptProcessorService {
  async processPrompt(promptId: string) {
    // 1. Get prompt
    prompt = await promptRepository.findById(promptId)
    if (!prompt) throw NotFoundException('Prompt not found')
    
    // 2. Idempotency check
    if (prompt.status === 'COMPLETED') {
      return // Already processed
    }
    if (prompt.status === 'PROCESSING') {
      return // Currently processing (race condition protection)
    }
    
    try {
      // 3. Update status to PROCESSING
      await promptRepository.update(promptId, { status: 'PROCESSING' })
      
      // 4. Check if audio already exists (idempotency)
      existingAudio = await audioRepository.findByPromptId(promptId)
      if (existingAudio) {
        // Audio already created, just update status
        await promptRepository.update(promptId, { status: 'COMPLETED' })
        return
      }
      
      // 5. Simulate generation (2-5 seconds)
      await sleep(random(2000, 5000))
      
      // 6. Create audio
      audio = await audioRepository.create({
        promptId: prompt.id,
        userId: prompt.userId,
        title: `Audio for: ${prompt.text.substring(0, 50)}`,
        url: `https://storage.example.com/audio/${uuidv4()}.mp3`
      })
      
      // 7. Update prompt status to COMPLETED
      await promptRepository.update(promptId, { status: 'COMPLETED' })
      
      // 8. Send WebSocket notification
      await websocketService.notifyUser(prompt.userId, {
        event: 'prompt:completed',
        data: { promptId: prompt.id, audioId: audio.id }
      })
    } catch (error) {
      // 9. Error handling: Reset to PENDING on failure
      await promptRepository.update(promptId, { status: 'PENDING' })
      throw error
    }
  }
}
```

#### Rate Limiting Interceptor

```typescript
class RateLimitInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    request = context.switchToHttp().getRequest()
    user = request.user // From JWT Guard
    
    if (!user) return next.handle() // Public route
    
    // 1. Get user subscription status
    userEntity = await userRepository.findById(user.id)
    if (!userEntity) return next.handle()
    
    // 2. Determine limit based on subscription
    isPaid = userEntity.subscriptionStatus === 'PAID'
    limit = isPaid ? 100 : 20 // PAID: 100/min, FREE: 20/min
    windowMs = 60000 // 1 minute
    
    // 3. Check rate limit
    identifier = `user:${user.id}`
    allowed = await rateLimiter.checkLimit(identifier, limit, windowMs)
    
    // 4. Reject if exceeded
    if (!allowed) {
      throw HttpException({
        statusCode: 429,
        message: 'Rate limit exceeded. Please try again later.',
        limit,
        windowMs
      }, 429)
    }
    
    // 5. Allow request
    return next.handle()
  }
}
```

#### Search Service

```typescript
class SearchService {
  async search(query: string, page: number, limit: number) {
    // 1. Validate query
    if (!query || query.trim().length === 0) {
      return { users: { data: [], meta: {} }, audio: { data: [], meta: {} } }
    }
    
    trimmedQuery = query.trim()
    
    // 2. Search in parallel
    [userResults, audioResults] = await Promise.all([
      userRepository.search(trimmedQuery, undefined, limit),
      audioRepository.search(trimmedQuery, undefined, limit)
    ])
    
    // 3. Rank results
    rankedUsers = this.rankUsers(userResults.users, trimmedQuery)
    rankedAudios = this.rankAudios(audioResults.audios, trimmedQuery)
    
    // 4. Return ranked results
    return {
      users: {
        data: rankedUsers.map(u => ({ id, email, displayName, subscriptionStatus })),
        meta: { nextCursor: userResults.nextCursor }
      },
      audio: {
        data: rankedAudios.map(a => ({ id, promptId, userId, title, url })),
        meta: { nextCursor: audioResults.nextCursor }
      }
    }
  }
  
  private rankUsers(users, query) {
    return users.sort((a, b) => {
      // Calculate scores
      aScore = Math.max(
        a.email.toLowerCase() === query.toLowerCase() ? 3 : 0,
        a.email.toLowerCase().includes(query.toLowerCase()) ? 2 : 0,
        a.displayName.toLowerCase() === query.toLowerCase() ? 3 : 0,
        a.displayName.toLowerCase().includes(query.toLowerCase()) ? 2 : 0
      )
      bScore = Math.max(
        b.email.toLowerCase() === query.toLowerCase() ? 3 : 0,
        b.email.toLowerCase().includes(query.toLowerCase()) ? 2 : 0,
        b.displayName.toLowerCase() === query.toLowerCase() ? 3 : 0,
        b.displayName.toLowerCase().includes(query.toLowerCase()) ? 2 : 0
      )
      return bScore - aScore // Descending
    })
  }
}
```

---

## 🔌 API Endpoints

### Authentication (Public - No Bearer Token Required)

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user (requires Bearer token)

### Users (Protected - Bearer Token Required)

- `GET /users` - Get all users (paginated)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user (only own profile)

### Prompts (Protected - Bearer Token Required)

All prompt endpoints automatically use the authenticated user's ID from the JWT token. No `user_id` is required in request payloads.

- `POST /prompts` - Create new prompt (user ID from token)
- `GET /prompts` - Get your prompts (paginated, user ID from token)
- `GET /prompts/:id` - Get prompt by ID (only if it belongs to you)

### Audio (Protected - Bearer Token Required)

All audio endpoints automatically filter by the authenticated user's ID from the JWT token. Users can only access their own audio files.

- `GET /audio` - Get your audio files (paginated, user ID from token)
- `GET /audio/:id` - Get audio by ID (only if it belongs to you)
- `PUT /audio/:id` - Update audio (only if it belongs to you)

### Subscription (Protected - Bearer Token Required)

Subscription endpoints automatically use the authenticated user's ID from the JWT token.

- `POST /subscription/subscribe` - Subscribe to paid tier (user ID from token)
- `POST /subscription/cancel` - Cancel subscription (user ID from token)

### Search (Protected - Bearer Token Required)

- `GET /search?q={query}&page={page}&limit={limit}` - Unified search

### WebSocket

- Connect to `/notifications` namespace
- Join room: `user:{userId}`
- Listen for: `prompt:completed` event

---

## 🧪 Testing

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run specific test file
npm test auth.service.spec
npm test prompt.service.spec
npm test subscription.service.spec
npm test audio.service.spec
npm test search.service.spec

# Run E2E tests
npm run test:e2e

# Generate test coverage report
npm run test:cov

# View coverage report (HTML)
open coverage/index.html
```

### Test Structure

- **Unit Tests**: `src/**/*.spec.ts` - Test individual services and components
- **E2E Tests**: `test/**/*.e2e-spec.ts` - Test complete API endpoints

### Test Coverage

- ✅ **Auth Service**: Registration, login, token refresh, password validation
- ✅ **Prompt Service**: Create, find, pagination, ownership checks
- ✅ **Subscription Service**: Subscribe, cancel, lifecycle
- ✅ **Audio Service**: CRUD operations, caching, ownership checks
- ✅ **Search Service**: Ranking algorithm, pagination, query handling

### Load Testing

#### Recommended: Run All Tests

**Script**: `load-test-all.sh`

**Purpose**: Runs comprehensive test first, then all dedicated tests using the same registered users.

**Run**:
```bash
# Make executable (first time only)
chmod +x load-test-all.sh

# Run all load tests
./load-test-all.sh
```

This will run comprehensive test, then prompts, subscription, and audio tests using the same users.

#### Comprehensive Load Test

**Script**: `load-test-comprehensive.sh`

**Purpose**: Comprehensive load testing including user registration, subscription, prompts, and WebSocket.

**Run**:
```bash
# Make executable (first time only)
chmod +x load-test-comprehensive.sh

# Run comprehensive load test
./load-test-comprehensive.sh

# Customize configuration
NUM_USERS=50 REQUESTS_PER_USER=20 PROMPTS_PER_USER=10 ./load-test-comprehensive.sh
```

**What It Tests**:
- ✅ User registration (19 users by default)
- ✅ Subscription testing (subscribe/cancel per user, 10 requests/user)
- ✅ Prompt creation (5 prompts per user)
- ✅ Audio retrieval
- ✅ WebSocket notifications (requires Node.js)

**Note**: At the end, it exports `USER_TOKENS` and `USER_IDS` to `/tmp/load-test-tokens.sh` for use in dedicated load tests.

#### Dedicated Load Tests

**Prompts Load Test** (`load-test-prompts.sh`):
```bash
# Make executable (first time only)
chmod +x load-test-prompts.sh

# Run prompts load test (will register new users if tokens not provided)
./load-test-prompts.sh

# Or use tokens from comprehensive test:
source /tmp/load-test-tokens.sh  # After running load-test-comprehensive.sh
./load-test-prompts.sh

# Customize
NUM_USERS=20 PROMPTS_PER_USER=30 CONCURRENT_REQUESTS=100 ./load-test-prompts.sh
```

**What It Tests**:
- ✅ Create prompts (default: 20 per user)
- ✅ List prompts with pagination
- ✅ Get prompt by ID
- ✅ Concurrent prompt creation (default: 50 requests)
- ✅ Concurrent prompt listing (default: 50 requests)

**Note**: If `USER_TOKENS` and `USER_IDS` environment variables are set, it will use those tokens instead of registering new users.

**Subscription Load Test** (`load-test-subscription.sh`):
```bash
# Make executable (first time only)
chmod +x load-test-subscription.sh

# Run subscription load test (will register new users if tokens not provided)
./load-test-subscription.sh

# Or use tokens from comprehensive test:
source /tmp/load-test-tokens.sh  # After running load-test-comprehensive.sh
./load-test-subscription.sh

# Customize
NUM_USERS=50 REQUESTS_PER_USER=20 CONCURRENT_REQUESTS=100 ./load-test-subscription.sh
```

**What It Tests**:
- ✅ Subscribe to PAID tier
- ✅ Cancel subscriptions
- ✅ Status checks (default: 10 per user)
- ✅ Concurrent subscribe operations (default: 50 requests)
- ✅ Concurrent status checks (default: 50 requests)
- ✅ Subscribe/cancel cycles (5 cycles per user)

**Note**: If `USER_TOKENS` and `USER_IDS` environment variables are set, it will use those tokens instead of registering new users.

**Audio Load Test** (`load-test-audio.sh`):
```bash
# Make executable (first time only)
chmod +x load-test-audio.sh

# Run audio load test (will register new users if tokens not provided)
./load-test-audio.sh

# Or use tokens from comprehensive test:
source /tmp/load-test-tokens.sh  # After running load-test-comprehensive.sh
./load-test-audio.sh

# Customize
NUM_USERS=20 PROMPTS_PER_USER=10 CONCURRENT_REQUESTS=100 WAIT_FOR_PROCESSING=60 ./load-test-audio.sh
```

**What It Tests**:
- ✅ List audio files with pagination
- ✅ Get audio by ID
- ✅ Update audio metadata
- ✅ Concurrent audio listing (default: 50 requests)
- ✅ Concurrent get by ID (default: 50 requests)

**Note**: If `USER_TOKENS` and `USER_IDS` environment variables are set, it will use those tokens instead of registering new users.

#### Rate Limiting Load Test

**Script**: `load-test.sh`

**Purpose**: Validates rate limiting behavior, high request volume handling, and HTTP status codes.

**Run**:
```bash
# Make executable (first time only)
chmod +x load-test.sh

# Run load test
./load-test.sh

# Or with custom API URL
API_URL=http://localhost:3000 ./load-test.sh
```

**What It Tests**:
- ✅ Rate limiting (FREE: 20/min, PAID: 100/min)
- ✅ High request volume (50 parallel requests)
- ✅ HTTP status codes (200, 401, 429)
- ✅ Concurrent request handling
- ✅ Performance metrics (requests/second)

#### WebSocket Load Test

**Script**: `test-websocket.js`

**Purpose**: Tests WebSocket connections and notifications.

**Run**:
```bash
# Install socket.io-client (first time)
npm install socket.io-client

# Run WebSocket test
node test-websocket.js 25 http://localhost:3000
```

**Example Output**:
```
🚀 Load Testing - Rate Limiting Validation
==============================================
✅ API is running
✅ Authentication successful

Test 1: FREE Tier Rate Limiting (20 req/min)
  ✅ Successful (200): 20
  ⚠️  Rate Limited (429): 5

Test 2: High Request Volume
  Duration: 2s
  ✅ Successful (200): 20
  ⚠️  Rate Limited (429): 30
  Requests/sec: 25.00

Test 3: HTTP Status Code Validation
  ✅ Valid authenticated request: 200 OK
  ✅ Missing Bearer token: 401 Unauthorized
  ✅ Invalid Bearer token: 401 Unauthorized
  ✅ Rate limit exceeded: 429 Too Many Requests
```

**For detailed load testing guide, see**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

### Docker Health Checks

The application includes comprehensive health check endpoints for container orchestration:

#### Health Endpoints

1. **`GET /health`** - Full health check
   - Checks database connection
   - Checks Redis cache connection
   - Returns 200 if healthy, 503 if degraded

2. **`GET /health/live`** - Liveness probe
   - Indicates if the service is running
   - Always returns 200 (if service is up)

3. **`GET /health/ready`** - Readiness probe
   - Indicates if the service is ready to accept traffic
   - Checks database and cache availability
   - Returns 200 if ready, 503 if not ready

#### Docker Configuration

**docker-compose.yml** includes health checks:

```yaml
api:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health/live"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  restart: unless-stopped
```

**Behavior**:
- Checks every 30 seconds
- 10 second timeout per check
- 3 retries before marking unhealthy
- 40 second grace period on startup
- **Automatic restart** on failure (`restart: unless-stopped`)

#### Checking Container Health

```bash
# Check container health status
docker ps

# View detailed health check logs
docker inspect musicpt_api | jq '.[0].State.Health'

# Monitor health status
watch -n 1 'docker inspect musicpt_api | jq -r ".[0].State.Health.Status"'

# Test health endpoint manually
curl http://localhost:3000/health
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

#### Container Restart Policy

- **Policy**: `unless-stopped`
- **Behavior**: Container automatically restarts if it:
  - Crashes
  - Fails health checks
  - Exits with error
- **Manual Stop**: Container will NOT restart if manually stopped with `docker stop`

**Restart Scenarios**:
1. **Application Crash**: Container restarts automatically
2. **Health Check Failure**: After 3 failed checks, container restarts
3. **Out of Memory**: Container restarts (if configured)
4. **Database Connection Loss**: Health check fails → container restarts

**For detailed health check guide, see**: [TESTING_GUIDE.md](./TESTING_GUIDE.md#health-checks)

---

## 📝 License

MIT

---

## 👥 Author

Built as a demonstration of senior-level backend architecture and implementation.

---

## 🚀 Deployment

### Docker Deployment

The application is Docker-ready with health checks and automatic restarts:

```bash
# Start all services
docker-compose up -d

# Check container health
docker ps

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Health Checks

All containers include health checks:
- **API**: Checks `/health/live` endpoint every 30s
- **Worker**: Checks process status
- **PostgreSQL**: Checks database readiness
- **Redis**: Checks cache availability

**Automatic Restart**: Containers restart automatically on failure (`restart: unless-stopped`)

### Deployment Platforms

The application can be deployed to:
- **Render**: Supports Docker and health checks
- **Fly.io**: Docker-based deployment
- **Railway**: Docker container support
- **AWS EC2**: Docker Compose or ECS
- **Kubernetes**: Health probes ready (`/health/live`, `/health/ready`)
- **Any Docker-compatible platform**

### Environment Variables

Ensure environment variables are set correctly in your deployment environment:

```env
DATABASE_URL=postgresql://...
REDIS_HOST=...
REDIS_PORT=6379
JWT_SECRET=...
NODE_ENV=production
```

### CI/CD

The project includes GitHub Actions CI/CD pipeline that:
- ✅ Runs on every push/PR
- ✅ Tests all code
- ✅ Builds application
- ✅ Validates Docker configuration

**View Pipeline**: GitHub → Actions tab

---

## 📚 Additional Documentation

- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Comprehensive testing guide
- **[RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md)** - Rate limiting details
- **[UNIFIED_SEARCH_GUIDE.md](./UNIFIED_SEARCH_GUIDE.md)** - Search functionality guide
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Architecture explanation
