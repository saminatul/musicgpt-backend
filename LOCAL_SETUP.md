# Local Development Setup Guide

This guide will help you run and test the MusicGPT backend on your local machine.

## 📋 Prerequisites

- Node.js 20+ installed
- npm or yarn
- Docker Desktop (for PostgreSQL and Redis) OR local PostgreSQL and Redis installations

---

## 🚀 Quick Start (Using Docker for Database & Redis)

### Step 1: Start Database and Redis Services

```bash
# Start only PostgreSQL and Redis containers
docker-compose up -d postgres redis
```

Wait for services to be healthy (about 10-15 seconds).

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and ensure these values for local development:
# DATABASE_URL=postgresql://musicpt_user:musicpt_password@localhost:5432/musicpt_db?schema=public
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

### Step 4: Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### Step 5: Start the API Server

```bash
# Development mode (with hot reload)
npm run start:dev
```

The API will be available at: **http://localhost:3000**

### Step 6: Start the Worker (in a separate terminal)

```bash
# Build first
npm run build

# Start worker
npm run worker
```

### Step 7: Access Swagger Documentation

Open your browser and navigate to:
**http://localhost:3000/docs**

---

## 🧪 Testing the Application

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "uuid-refresh-token",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "displayName": "Test User",
    "subscriptionStatus": "FREE"
  }
}
```

**Save the `accessToken` for subsequent requests!**

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Create a Prompt (Authenticated)

```bash
# Replace YOUR_ACCESS_TOKEN with the token from registration/login
# Note: user_id is NOT required - it's automatically extracted from the JWT token
curl -X POST http://localhost:3000/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "text": "Generate a relaxing jazz melody"
  }'
```

**Important**: The user ID is automatically extracted from the JWT token. You don't need to include `user_id` in the request body.

**Expected Response:**
```json
{
  "id": "prompt-uuid",
  "text": "Generate a relaxing jazz melody",
  "status": "PENDING",
  "createdAt": "2024-01-15T...",
  "updatedAt": "2024-01-15T..."
}
```

### 4. Check Your Prompts

```bash
# Get all your prompts (user ID automatically from token)
curl -X GET http://localhost:3000/prompts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get specific prompt (only if it belongs to you)
curl -X GET http://localhost:3000/prompts/{prompt-id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Subscribe to Paid Tier

```bash
curl -X POST http://localhost:3000/subscription/subscribe \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. Search

```bash
curl -X GET "http://localhost:3000/search?q=test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7. Get Your Audio Files

```bash
# Get all your audio files (user ID automatically from token)
curl -X GET "http://localhost:3000/audio?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get specific audio (only if it belongs to you)
curl -X GET "http://localhost:3000/audio/{audio-id}" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 8. Get All Users

```bash
curl -X GET "http://localhost:3000/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🔍 Monitoring the Application

### Check Logs

**API Server:**
- Watch the terminal where `npm run start:dev` is running
- You'll see request logs, errors, etc.

**Worker:**
- Watch the terminal where `npm run worker` is running
- You'll see job processing logs:
  - "Processing job for prompt {id}"
  - "Successfully processed prompt {id}"

**Cron Scheduler:**
- Check API server logs
- Every 30 seconds you should see:
  - "Scanning for pending prompts..."
  - "Found X pending prompts"
  - "Successfully enqueued X prompts"

### Check Database

```bash
# Open Prisma Studio
npx prisma studio
```

This opens a web interface at **http://localhost:5555** where you can:
- View all tables (users, prompts, audio, refresh_tokens)
- See data in real-time
- Manually edit records

### Check Redis

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check cache keys
KEYS *

# Check rate limit keys
KEYS rate_limit:*

# Check queue
KEYS *prompt-processing*
```

---

## 🐛 Troubleshooting

### Issue: Database Connection Error

**Error:** `Can't reach database server`

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart if needed
docker-compose restart postgres
```

### Issue: Redis Connection Error

**Error:** `Redis connection failed`

**Solution:**
```bash
# Check if Redis is running
docker-compose ps redis

# Check logs
docker-compose logs redis

# Restart if needed
docker-compose restart redis
```

### Issue: Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process or change PORT in .env
```

### Issue: Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
npx prisma generate
```

### Issue: Migrations Not Applied

**Error:** `Table does not exist`

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or apply migrations
npx prisma migrate deploy
```

---

## 📊 Testing the Complete Flow

### End-to-End Test Script

1. **Register User**
2. **Login** (get token)
3. **Create Prompt** (status: PENDING)
4. **Wait 30-60 seconds** (cron will enqueue, worker will process)
5. **Check Prompt Status** (should be COMPLETED)
6. **Check Audio** (should be created)
7. **WebSocket Notification** (should be received if connected)

### WebSocket Testing

1. **Install a WebSocket client** (e.g., Postman, wscat, or browser extension)

2. **Connect to WebSocket:**
   ```
   ws://localhost:3000/notifications
   ```

3. **Join user room** (send message):
   ```json
   {
     "event": "join",
     "data": {
       "userId": "your-user-id"
     }
   }
   ```

4. **Create a prompt** (via API)
5. **Wait for notification:**
   ```json
   {
     "event": "prompt:completed",
     "data": {
       "promptId": "...",
       "audioId": "...",
       "message": "Your prompt has been processed successfully"
     }
   }
   ```

---

## 🛠️ Development Commands

```bash
# Start API in development mode
npm run start:dev

# Start API in production mode
npm run build
npm run start:prod

# Start worker
npm run build
npm run worker

# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Format code
npm run format

# Lint code
npm run lint

# Run tests
npm run test
```

---

## 📝 Environment Variables for Local Development

Make sure your `.env` file has:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://musicpt_user:musicpt_password@localhost:5432/musicpt_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d
RATE_LIMIT_FREE_TIER=20
RATE_LIMIT_PAID_TIER=100
RATE_LIMIT_WINDOW_MS=300000
CACHE_TTL=60
QUEUE_NAME=prompt-processing
QUEUE_CONCURRENCY=5
CRON_SCAN_INTERVAL=*/30 * * * * *
```

---

## ✅ Verification Checklist

- [ ] PostgreSQL is running (port 5432)
- [ ] Redis is running (port 6379)
- [ ] Database migrations applied
- [ ] Prisma Client generated
- [ ] API server running (port 3000)
- [ ] Worker service running
- [ ] Swagger docs accessible at /docs
- [ ] Can register/login users
- [ ] Can create prompts
- [ ] Prompts are being processed
- [ ] WebSocket notifications working

---

## 🎯 Quick Test Commands

```bash
# Test API health (should return 404 or 401, but server is up)
curl http://localhost:3000

# Test Swagger
open http://localhost:3000/docs

# Test database connection
npx prisma studio

# Test Redis connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

---

## 📚 Additional Resources

- **Swagger UI**: http://localhost:3000/docs
- **Prisma Studio**: http://localhost:5555 (when running `npx prisma studio`)
- **API Base URL**: http://localhost:3000
- **WebSocket**: ws://localhost:3000/notifications

---

Happy coding! 🚀
