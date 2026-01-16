# 🚀 Comprehensive Load Testing Guide

## Overview

This guide covers comprehensive load testing including user registration, subscription testing, prompt creation, and WebSocket notifications.

---

## Quick Start

### Comprehensive Load Test

```bash
# Run comprehensive load test (19 users, 10 subscription requests/user, 5 prompts/user)
./load-test-comprehensive.sh

# Customize configuration
NUM_USERS=50 REQUESTS_PER_USER=20 PROMPTS_PER_USER=10 ./load-test-comprehensive.sh
```

### Rate Limiting Test

```bash
# Run rate limiting test only
./load-test.sh
```

### WebSocket Test

```bash
# Install socket.io-client (first time)
npm install socket.io-client

# Run WebSocket test
node test-websocket.js 25 http://localhost:3000
```

---

## Comprehensive Load Test (`load-test-comprehensive.sh`)

### What It Tests

1. **User Registration** (19 users by default)
   - Registers users with unique emails
   - Collects access tokens and user IDs
   - Measures registration rate

2. **Subscription Testing** (10 requests per user)
   - Subscribe to PAID tier
   - Make 10 subscription-related API calls per user
   - Cancel subscription
   - Validates subscription lifecycle

3. **Prompt Creation** (5 prompts per user)
   - Creates prompts for each user
   - Tracks prompt IDs
   - Measures creation rate

4. **Audio Retrieval**
   - Waits for prompts to be processed
   - Retrieves audio files for each user
   - Validates audio creation

5. **WebSocket Notifications** (optional, requires Node.js)
   - Tests WebSocket connections
   - Validates notification delivery

### Configuration

Environment variables:

```bash
# Number of users to register
NUM_USERS=19

# Subscription requests per user
REQUESTS_PER_USER=10

# Prompts to create per user
PROMPTS_PER_USER=5

# API base URL
API_URL=http://localhost:3000

# WebSocket URL (auto-detected from API_URL)
WS_URL=ws://localhost:3000
```

### Example Output

```
🚀 Comprehensive Load Testing
==============================================
Configuration:
  Users to register: 25
  Subscription requests per user: 10
  Prompts per user: 5

==============================================
Test 1: User Registration (25 users)
==============================================
  User 1: ✅ Registered (loadtest-user-1-1234567890@example.com)
  User 2: ✅ Registered (loadtest-user-2-1234567891@example.com)
  ...

Results:
  ✅ Successful: 25
  ❌ Failed: 0
  Duration: 3s
  Rate: 8.33 users/sec

==============================================
Test 2: Subscription Testing (10 requests/user)
==============================================
  User 1: Subscribe ✅ | Cancel ✅ | 10 requests
  User 2: Subscribe ✅ | Cancel ✅ | 10 requests
  ...

Results:
  ✅ Subscribe successful: 25
  ✅ Cancel successful: 25
  Total requests: 500

==============================================
Test 3: Prompt Creation (5 prompts/user)
==============================================
  User 1: Created 5 prompts ✅
  User 2: Created 5 prompts ✅
  ...

Results:
  ✅ Successful: 125
  Total prompts created: 125
  Rate: 12.50 prompts/sec

==============================================
Test 4: WebSocket Notifications
==============================================
⚠️  WebSocket testing requires socket.io-client

==============================================
Test 5: Audio Retrieval
==============================================
Waiting 10 seconds for prompts to be processed...
  User 1: ✅ Found 5 audio files
  User 2: ✅ Found 5 audio files
  ...

Results:
  ✅ Successful: 25
  Duration: 2s

📊 Comprehensive Load Test Summary
==============================================
Test Results:
  ✅ User Registration: 25/25
  ✅ Subscription Tests: 25 subscribe, 25 cancel
  ✅ Prompt Creation: 125 prompts created
  ✅ Audio Retrieval: 25/25

Total Operations:
  Total API calls: ~600
```

---

## WebSocket Testing

### Prerequisites

```bash
# Install socket.io-client
npm install socket.io-client
```

### Running WebSocket Test

**Option 1: After Comprehensive Load Test**

```bash
# Run comprehensive test first
./load-test-comprehensive.sh

# Export user data (shown at end of comprehensive test)
export USER_TOKENS="token1,token2,token3,..."
export USER_IDS="id1,id2,id3,..."

# Run WebSocket test
node test-websocket.js 25 http://localhost:3000
```

**Option 2: Manual Setup**

```bash
# Get user tokens manually
TOKEN1=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"Password123","displayName":"User 1"}' \
  | jq -r '.accessToken')

# Set environment variables
export USER_TOKENS="$TOKEN1,$TOKEN2,..."
export USER_IDS="user-id-1,user-id-2,..."

# Run test
node test-websocket.js 25 http://localhost:3000
```

### WebSocket Test Flow

1. **Connect**: Connects to `/notifications` namespace
2. **Join Room**: Emits `join` event with `{ userId }`
3. **Listen**: Listens for `prompt:completed` events
4. **Validate**: Verifies notifications are received

### Expected Events

- **`joined`**: Confirmation that user joined room
- **`prompt:completed`**: Notification when prompt processing completes
  - Payload: `{ promptId, audioId, message }`

---

## Test Scenarios

### Scenario 1: Full Load Test

```bash
# Register 25 users, test subscription, create prompts, test WebSocket
./load-test-comprehensive.sh

# Then test WebSocket
export USER_TOKENS="..." # From comprehensive test output
export USER_IDS="..."    # From comprehensive test output
node test-websocket.js 25 http://localhost:3000
```

### Scenario 2: High Volume Test

```bash
# Test with 100 users
NUM_USERS=100 REQUESTS_PER_USER=20 PROMPTS_PER_USER=10 ./load-test-comprehensive.sh
```

### Scenario 3: Subscription Focus

```bash
# Test subscription with many requests
NUM_USERS=25 REQUESTS_PER_USER=50 ./load-test-comprehensive.sh
```

### Scenario 4: Prompt Focus

```bash
# Test prompt creation with many prompts
NUM_USERS=25 PROMPTS_PER_USER=20 ./load-test-comprehensive.sh
```

---

## Monitoring During Tests

### Check API Logs

```bash
# Docker
docker-compose logs -f api

# Local
# Check terminal where API is running
```

### Check Worker Logs

```bash
# Docker
docker-compose logs -f worker

# Local
# Check terminal where worker is running
```

### Check Database

```bash
# Connect to database
docker exec -it musicpt_postgres psql -U musicpt_user -d musicpt_db

# Check user count
SELECT COUNT(*) FROM users;

# Check prompt count
SELECT COUNT(*) FROM prompts WHERE status = 'COMPLETED';

# Check audio count
SELECT COUNT(*) FROM audio;
```

### Check Redis

```bash
# Connect to Redis
docker exec -it musicpt_redis redis-cli

# Check rate limit keys
KEYS rate_limit:user:*

# Check queue
KEYS bull:prompt-processing:*
```

---

## Troubleshooting

### Issue: Registration Fails

**Check**:
- API is running
- Database is accessible
- Password validation (must meet complexity requirements)

### Issue: Subscription Fails

**Check**:
- User exists
- Bearer token is valid
- Rate limiting not exceeded

### Issue: Prompts Not Created

**Check**:
- Bearer token is valid
- User exists
- API is responding

### Issue: WebSocket Not Connecting

**Check**:
- WebSocket server is running
- Port 3000 is accessible
- socket.io-client is installed
- Namespace is `/notifications`

### Issue: No Audio Files

**Check**:
- Worker is running
- Prompts are being processed
- Job queue is working
- Wait longer (prompts take 2-5 seconds to process)

---

## Performance Benchmarks

### Expected Performance

- **User Registration**: ~8-10 users/second
- **Subscription Operations**: ~50-100 requests/second
- **Prompt Creation**: ~10-15 prompts/second
- **Audio Retrieval**: ~20-30 requests/second
- **WebSocket Connections**: ~10-20 connections/second

### Rate Limiting Impact

- **FREE Tier**: 20 requests/minute per user
- **PAID Tier**: 100 requests/minute per user
- Tests may hit rate limits with high `REQUESTS_PER_USER`

---

## Best Practices

1. **Start Small**: Begin with `NUM_USERS=5` to verify setup
2. **Monitor Resources**: Watch CPU, memory, and database connections
3. **Check Logs**: Monitor API and worker logs during tests
4. **Clean Up**: Remove test users after testing (optional)
5. **Incremental Testing**: Test one feature at a time first

---

## Summary

✅ **Comprehensive Load Test**: `load-test-comprehensive.sh`
- User registration (25 users)
- Subscription testing (10 requests/user)
- Prompt creation (5 prompts/user)
- Audio retrieval
- WebSocket testing (optional)

✅ **Rate Limiting Test**: `load-test.sh`
- Rate limit validation
- High volume handling
- HTTP status codes

✅ **WebSocket Test**: `test-websocket.js`
- Connection testing
- Notification delivery
- Room joining

For more details, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)
