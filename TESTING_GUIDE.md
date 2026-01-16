# 🧪 Testing Guide

This guide covers all testing aspects of the MusicGPT backend, including unit tests, integration tests, CI/CD, load testing, and health checks.

---

## 📋 Table of Contents

- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Unit Tests](#unit-tests)
- [Integration/E2E Tests](#integratione2e-tests)
- [CI/CD Pipeline](#cicd-pipeline)
- [Load Testing](#load-testing)
- [Health Checks](#health-checks)

---

## Running Tests

### Prerequisites

Ensure you have:
- Node.js 20+
- PostgreSQL running (for E2E tests)
- Redis running (for E2E tests)

### Quick Start

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e
```

---

## Test Structure

```
src/
├── application/
│   └── services/
│       ├── auth.service.spec.ts          # Unit tests
│       └── search.service.spec.ts        # Unit tests
test/
└── app.e2e-spec.ts                       # E2E tests
```

---

## Unit Tests

### Auth Service Tests

**File**: `src/application/services/auth.service.spec.ts`

**Coverage**:
- ✅ User registration (success and duplicate email)
- ✅ User login (success, invalid user, wrong password)
- ✅ Token refresh (success, invalid token, revoked token, expired token)
- ✅ Password hashing
- ✅ Token generation

**Run**:
```bash
npm test auth.service.spec
```

### Search Service Tests

**File**: `src/application/services/search.service.spec.ts`

**Coverage**:
- ✅ Empty query handling
- ✅ Parallel search execution
- ✅ Ranking algorithm (exact vs partial matches)
- ✅ Cursor-based pagination
- ✅ Query trimming

**Run**:
```bash
npm test search.service.spec
```

---

## Integration/E2E Tests

### End-to-End Tests

**File**: `test/app.e2e-spec.ts`

**Coverage**:
- ✅ Health check endpoint
- ✅ Authentication (register, login, password validation)
- ✅ Protected endpoints (authorization required)
- ✅ UUID validation
- ✅ User profile updates (ownership checks)
- ✅ Search functionality
- ✅ Rate limiting status

**Run**:
```bash
npm run test:e2e
```

**Setup**:
```bash
# Start services
docker-compose up -d postgres redis

# Run migrations
npx prisma migrate deploy

# Run tests
npm run test:e2e
```

---

## CI/CD Pipeline

### GitHub Actions

**File**: `.github/workflows/ci.yml`

**Pipeline Steps**:
1. ✅ Checkout code
2. ✅ Setup Node.js 20
3. ✅ Install dependencies
4. ✅ Generate Prisma Client
5. ✅ Run database migrations
6. ✅ Run linter
7. ✅ Run unit tests
8. ✅ Run E2E tests
9. ✅ Generate test coverage
10. ✅ Build application
11. ✅ Verify build artifacts

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Services**:
- PostgreSQL 15 (test database)
- Redis 7 (test cache)

**View Pipeline**:
- Go to GitHub repository → Actions tab
- View workflow runs and results

---

## Load Testing

### Comprehensive Load Test

**File**: `load-test-comprehensive.sh`

**What It Tests**:
- ✅ User registration (19 users by default)
- ✅ Subscription testing (subscribe/cancel per user, 10 requests/user)
- ✅ Prompt creation (5 prompts per user)
- ✅ Audio retrieval
- ✅ WebSocket notifications (requires Node.js)

**Run**:
```bash
# Make executable (first time only)
chmod +x load-test-comprehensive.sh

# Run comprehensive load test
./load-test-comprehensive.sh

# Customize number of users
NUM_USERS=50 ./load-test-comprehensive.sh

# Customize requests per user
REQUESTS_PER_USER=20 ./load-test-comprehensive.sh
```

**Configuration**:
- `NUM_USERS`: Number of users to register (default: 25)
- `REQUESTS_PER_USER`: Subscription requests per user (default: 10)
- `PROMPTS_PER_USER`: Prompts to create per user (default: 5)
- `API_URL`: API base URL (default: http://localhost:3000)

### WebSocket Load Test

**File**: `test-websocket.js`

**Purpose**: Tests WebSocket connections and notifications for audio completion events.

**Prerequisites**:
```bash
npm install socket.io-client
```

**Run**:
```bash
# Set user tokens and IDs from comprehensive test
export USER_TOKENS="token1,token2,token3,..."
export USER_IDS="id1,id2,id3,..."

# Run WebSocket test
node test-websocket.js 25 http://localhost:3000
```

### Rate Limiting Load Test

**File**: `load-test.sh`

**What It Tests**:
- ✅ Rate limiting behavior (FREE tier: 20/min, PAID tier: 100/min)
- ✅ High request volume handling
- ✅ HTTP status codes (200, 401, 429)
- ✅ Concurrent request handling

**Run**:
```bash
# Make executable (first time only)
chmod +x load-test.sh

# Run load test
./load-test.sh

# Or with custom API URL
API_URL=http://localhost:3000 ./load-test.sh
```

**Test Scenarios**:

1. **Rate Limiting Test**
   - Sends 25 requests rapidly to FREE tier user
   - Verifies first 20 return 200 OK
   - Verifies requests 21+ return 429 Too Many Requests

2. **High Volume Test**
   - Sends 50 requests in parallel
   - Measures throughput (requests/second)
   - Verifies API stability under load

3. **HTTP Status Code Validation**
   - Valid authenticated request → 200
   - Missing Bearer token → 401
   - Invalid Bearer token → 401
   - Rate limit exceeded → 429

**Example Output**:
```
🚀 Load Testing - Rate Limiting Validation
==============================================

✅ API is running
✅ Authentication successful

==============================================
Test 1: FREE Tier Rate Limiting (20 req/min)
==============================================

Sending 25 requests rapidly...
  Request 1: 200 OK (Remaining: 19)
  Request 2: 200 OK (Remaining: 18)
  ...
  Request 21: 429 Rate Limited ✅ (Expected)

Results:
  ✅ Successful (200): 20
  ⚠️  Rate Limited (429): 5
  ❌ Errors: 0

✅ Rate limiting is working correctly
```

---

## Health Checks

### Health Endpoints

The application provides three health check endpoints:

#### 1. `/health` - Full Health Check

**Purpose**: Comprehensive health status including database and cache

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "cache": "healthy"
  },
  "httpStatus": 200
}
```

**Status Codes**:
- `200`: All checks healthy
- `503`: One or more checks unhealthy

#### 2. `/health/live` - Liveness Probe

**Purpose**: Indicates if the service is running (for Kubernetes/Docker)

**Response**:
```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Code**: Always `200` (if service is running)

#### 3. `/health/ready` - Readiness Probe

**Purpose**: Indicates if the service is ready to accept traffic

**Response**:
```json
{
  "status": "ready",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": true,
    "cache": true
  },
  "httpStatus": 200
}
```

**Status Codes**:
- `200`: Service is ready
- `503`: Service is not ready (database/cache unavailable)

### Docker Health Checks

**Configuration**: `docker-compose.yml`

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health/live"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Behavior**:
- Checks every 30 seconds
- 10 second timeout
- 3 retries before marking unhealthy
- 40 second grace period on startup

**Container Restart**:
- Unhealthy containers are automatically restarted
- `restart: unless-stopped` policy

### Testing Health Checks

```bash
# Full health check
curl http://localhost:3000/health

# Liveness probe
curl http://localhost:3000/health/live

# Readiness probe
curl http://localhost:3000/health/ready
```

### Docker Health Check Status

```bash
# Check container health status
docker ps

# View health check logs
docker inspect musicpt_api | jq '.[0].State.Health'

# Monitor health checks
watch -n 1 'docker inspect musicpt_api | jq -r ".[0].State.Health.Status"'
```

---

## Test Coverage

### Generate Coverage Report

```bash
npm run test:cov
```

**Output**: `coverage/` directory

**View HTML Report**:
```bash
open coverage/index.html
```

### Coverage Goals

- **Unit Tests**: > 80% coverage for critical services
- **Integration Tests**: All API endpoints covered
- **Critical Paths**: 100% coverage (auth, rate limiting, search)

---

## Continuous Integration

### GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

**Features**:
- ✅ Automatic runs on push/PR
- ✅ Parallel test execution
- ✅ Test coverage reporting
- ✅ Build verification
- ✅ Fails on any error

**Status Badge** (add to README):
```markdown
![CI](https://github.com/your-org/musicpt/workflows/CI%20Pipeline/badge.svg)
```

---

## Best Practices

### Writing Tests

1. **Arrange-Act-Assert Pattern**:
   ```typescript
   it('should do something', () => {
     // Arrange
     const input = 'test';
     
     // Act
     const result = service.doSomething(input);
     
     // Assert
     expect(result).toBe('expected');
   });
   ```

2. **Test Isolation**:
   - Each test should be independent
   - Use `beforeEach`/`afterEach` for cleanup
   - Mock external dependencies

3. **Descriptive Test Names**:
   ```typescript
   it('should throw ConflictException when user already exists', ...)
   ```

4. **Edge Cases**:
   - Empty inputs
   - Null/undefined values
   - Boundary conditions
   - Error scenarios

### Test Data

- Use factories for test data
- Clean up test data after tests
- Use unique identifiers (timestamps, UUIDs)

---

## Troubleshooting

### Tests Failing

1. **Database Connection**:
   ```bash
   # Ensure PostgreSQL is running
   docker-compose up -d postgres
   
   # Check connection
   psql -h localhost -U musicpt_user -d musicpt_db
   ```

2. **Redis Connection**:
   ```bash
   # Ensure Redis is running
   docker-compose up -d redis
   
   # Check connection
   redis-cli ping
   ```

3. **Environment Variables**:
   ```bash
   # Check .env file
   cat .env
   
   # Or set explicitly
   DATABASE_URL=... npm test
   ```

### E2E Tests Failing

1. **Database Migrations**:
   ```bash
   npx prisma migrate deploy
   ```

2. **Test Data Cleanup**:
   - E2E tests should clean up after themselves
   - Check for leftover test data

3. **Port Conflicts**:
   - Ensure port 3000 is available
   - Check for running instances

---

## Summary

✅ **Unit Tests**: Critical services covered  
✅ **E2E Tests**: All API endpoints tested  
✅ **CI Pipeline**: Automated testing on push/PR  
✅ **Load Testing**: Rate limiting and high volume validated  
✅ **Health Checks**: Docker and Kubernetes ready  

For questions or issues, check the test files or CI logs.
