# 🚦 Dynamic Rate Limiting Guide

## Overview

The MusicGPT backend implements **Redis-backed dynamic rate limiting** that adjusts based on user subscription tier:

- **FREE Tier**: 20 requests per minute
- **PAID Tier**: 100 requests per minute

Rate limiting is automatically enforced on all authenticated routes.

---

## How It Works

### Architecture

```
Request → JWT Auth Guard → Rate Limit Interceptor → Controller
                              ↓
                    Redis Rate Limiter
                    (checks user tier)
                              ↓
                    Allow/Reject Request
```

### Key Components

1. **RateLimitInterceptor** (`src/presentation/interceptors/rate-limit.interceptor.ts`)
   - Intercepts all authenticated requests
   - Fetches user subscription status
   - Applies tier-specific limits
   - Throws `429 Too Many Requests` when exceeded

2. **RedisRateLimiterService** (`src/infrastructure/rate-limiter/redis-rate-limiter.service.ts`)
   - Uses Redis for distributed rate limiting
   - Sliding window algorithm
   - Key format: `rate_limit:user:{userId}`

3. **Configuration** (`src/config/configuration.ts`)
   ```typescript
   rateLimit: {
     freeTier: 20,      // requests per window
     paidTier: 100,     // requests per window
     windowMs: 60000,   // 1 minute window
   }
   ```

---

## Checking Rate Limit Status

### Method 1: API Endpoint (Recommended)

**Endpoint**: `GET /users/rate-limit/status`

**Authentication**: Bearer token required

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

**Example Request**:
```bash
curl -X GET http://localhost:3000/users/rate-limit/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response (PAID user)**:
```json
{
  "remaining": 87,
  "limit": 100,
  "resetAt": "2024-01-15T10:30:00.000Z",
  "windowMs": 60000,
  "subscriptionStatus": "PAID",
  "tier": "PAID"
}
```

### Method 2: Direct Redis Query

You can check rate limits directly in Redis:

```bash
# Connect to Redis
docker exec -it musicpt-redis-1 redis-cli

# Check current count for a user
GET rate_limit:user:{userId}

# Check TTL (time until reset)
PTTL rate_limit:user:{userId}

# List all rate limit keys
KEYS rate_limit:user:*
```

**Example**:
```bash
# User ID: abc123
GET rate_limit:user:abc123
# Returns: "5" (5 requests used)

PTTL rate_limit:user:abc123
# Returns: 45000 (45 seconds until reset)
```

### Method 3: Monitor Rate Limit Headers

When a rate limit is exceeded, the API returns:

**Status Code**: `429 Too Many Requests`

**Response Body**:
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Please try again later.",
  "limit": 20,
  "windowMs": 60000
}
```

---

## Testing Rate Limiting

### Test FREE Tier (20 req/min)

```bash
# Get access token first
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123"}' \
  | jq -r '.accessToken')

# Make 25 requests rapidly
for i in {1..25}; do
  curl -X GET http://localhost:3000/users/rate-limit/status \
    -H "Authorization: Bearer $TOKEN"
  echo "Request $i"
done

# Request 21-25 should return 429
```

### Test PAID Tier (100 req/min)

```bash
# Use a PAID user's token
TOKEN="PAID_USER_TOKEN"

# Check status
curl -X GET http://localhost:3000/users/rate-limit/status \
  -H "Authorization: Bearer $TOKEN"

# Should show limit: 100
```

### Test Rate Limit Reset

```bash
# Check status
curl -X GET http://localhost:3000/users/rate-limit/status \
  -H "Authorization: Bearer $TOKEN"

# Wait for window to expire (check resetAt timestamp)
# Or manually reset in Redis:
docker exec -it musicpt-redis-1 redis-cli DEL rate_limit:user:{userId}

# Check again - should show full limit
```

---

## Rate Limit Behavior

### Sliding Window

- Uses Redis `INCR` with `PEXPIRE`
- Window starts on first request
- Resets automatically after `windowMs` milliseconds
- No fixed time boundaries (sliding, not fixed)

### Per-User Limits

- Each user has independent rate limit counter
- Limits are based on subscription tier
- Counters are isolated by user ID

### Error Handling

When rate limit is exceeded:
- Request is **rejected** (not queued)
- Returns `429 Too Many Requests`
- Includes limit and window information
- Client should wait until `resetAt` before retrying

---

## Configuration

### Environment Variables

```env
# Rate limiting configuration
RATE_LIMIT_FREE_TIER=20
RATE_LIMIT_PAID_TIER=100
RATE_LIMIT_WINDOW_MS=60000
```

### Changing Limits

1. Update `.env` file:
   ```env
   RATE_LIMIT_FREE_TIER=30
   RATE_LIMIT_PAID_TIER=150
   ```

2. Restart the API service:
   ```bash
   docker-compose restart api
   ```

3. Or for local development:
   ```bash
   npm run start:dev
   ```

---

## Monitoring & Debugging

### Check Redis Rate Limit Keys

```bash
# List all rate limit keys
docker exec -it musicpt-redis-1 redis-cli KEYS "rate_limit:*"

# Get specific user's count
docker exec -it musicpt-redis-1 redis-cli GET "rate_limit:user:abc123"

# Get TTL (time until reset in milliseconds)
docker exec -it musicpt-redis-1 redis-cli PTTL "rate_limit:user:abc123"
```

### Monitor Rate Limit Interceptor Logs

The interceptor logs rate limit violations. Check API logs:

```bash
# Docker
docker-compose logs -f api | grep -i "rate limit"

# Local
npm run start:dev
# Watch console for rate limit messages
```

### Redis Monitoring

```bash
# Monitor Redis commands in real-time
docker exec -it musicpt-redis-1 redis-cli MONITOR

# Check Redis memory usage
docker exec -it musicpt-redis-1 redis-cli INFO memory
```

---

## Best Practices

1. **Check Rate Limit Status Before Bulk Operations**
   ```bash
   # Check remaining requests
   curl GET /users/rate-limit/status
   
   # If remaining < 10, wait or batch requests
   ```

2. **Handle 429 Errors Gracefully**
   - Check `resetAt` timestamp
   - Implement exponential backoff
   - Show user-friendly error messages

3. **Monitor Rate Limit Usage**
   - Track rate limit status in your application
   - Alert users approaching limits
   - Consider upgrading subscription if frequently hitting limits

4. **Test Rate Limits in Development**
   - Use the `/users/rate-limit/status` endpoint
   - Test both FREE and PAID tiers
   - Verify reset behavior

---

## Troubleshooting

### Issue: Rate limit not working

**Check**:
1. Redis is running: `docker-compose ps redis`
2. Rate limit interceptor is applied: Check controller decorators
3. User is authenticated: Verify JWT token
4. Configuration is loaded: Check `.env` values

### Issue: Rate limit too strict/lenient

**Solution**:
1. Update `.env` configuration
2. Restart API service
3. Clear existing rate limit keys in Redis if needed

### Issue: Rate limit not resetting

**Check**:
1. Redis TTL is set correctly: `PTTL rate_limit:user:{id}`
2. Redis is not running out of memory
3. No manual key deletion interfering

---

## API Reference

### GET /users/rate-limit/status

**Description**: Get current rate limit status for authenticated user

**Authentication**: Required (Bearer token)

**Response**:
- `remaining`: Number of requests remaining in current window
- `limit`: Maximum requests allowed per window
- `resetAt`: Timestamp when rate limit resets
- `windowMs`: Window duration in milliseconds
- `subscriptionStatus`: User's subscription status (FREE/PAID)
- `tier`: Rate limit tier (FREE/PAID)

**Example**:
```bash
curl -X GET http://localhost:3000/users/rate-limit/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Summary

- ✅ **Redis-backed**: Distributed, scalable rate limiting
- ✅ **Tier-based**: FREE (20/min) vs PAID (100/min)
- ✅ **Automatic**: Enforced on all authenticated routes
- ✅ **Checkable**: Use `/users/rate-limit/status` endpoint
- ✅ **Configurable**: Adjust via environment variables

For questions or issues, check the API logs or Redis directly using the methods above.
