# 🚀 Quick Start Guide - Local Development

## Step-by-Step Setup (5 minutes)

### 1️⃣ Start Database & Redis

```bash
# Start PostgreSQL and Redis using Docker
docker-compose up -d postgres redis

# Wait 10 seconds for services to be ready
sleep 10
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Setup Environment

```bash
# Create .env file from example
cp .env.example .env

# Verify .env has correct values for localhost
cat .env | grep -E "DATABASE_URL|REDIS_HOST"
```

**Expected output:**
```
DATABASE_URL=postgresql://musicpt_user:musicpt_password@localhost:5432/musicpt_db?schema=public
REDIS_HOST=localhost
```

### 4️⃣ Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 5️⃣ Start API Server

**Terminal 1:**
```bash
npm run start:dev
```

You should see:
```
Application is running on: http://localhost:3000
Swagger documentation: http://localhost:3000/docs
```

### 6️⃣ Start Worker (Optional but Recommended)

**Terminal 2:**
```bash
npm run build
npm run worker
```

You should see:
```
Worker started. Processing jobs...
Worker is ready to process jobs
```

---

## ✅ Verify Everything is Working

### Check 1: Swagger Documentation
Open browser: **http://localhost:3000/docs**

### Check 2: Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

**Expected:** JSON response with `accessToken` and `refreshToken`

### Check 3: Create a Prompt

```bash
# Replace YOUR_TOKEN with the accessToken from step 2
curl -X POST http://localhost:3000/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Generate a relaxing jazz melody"
  }'
```

**Expected:** Prompt created with status "PENDING"

### Check 4: Watch Worker Process

In Terminal 2 (worker), you should see:
```
Processing job for prompt {id}
Successfully processed prompt {id}
```

### Check 5: Verify Prompt Completed

```bash
# Check prompt status (should be COMPLETED after ~30-60 seconds)
curl -X GET http://localhost:3000/prompts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Common Commands

```bash
# View API logs
# (in Terminal 1 where npm run start:dev is running)

# View worker logs
# (in Terminal 2 where npm run worker is running)

# View database
npx prisma studio
# Opens at http://localhost:5555

# Check Redis
docker-compose exec redis redis-cli ping
# Should return: PONG

# Restart services
docker-compose restart postgres redis

# Stop services
docker-compose down
```

---

## 🐛 Troubleshooting

**Problem:** Port 3000 already in use
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or change PORT in .env
```

**Problem:** Database connection error
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

**Problem:** Prisma errors
```bash
# Regenerate Prisma Client
npx prisma generate

# Reset database (WARNING: deletes data)
npx prisma migrate reset
```

---

## 📊 What to Check

- ✅ API running on http://localhost:3000
- ✅ Swagger docs on http://localhost:3000/docs
- ✅ Can register/login users
- ✅ Can create prompts
- ✅ Worker processing jobs
- ✅ Prompts changing from PENDING → PROCESSING → COMPLETED
- ✅ Audio entries created

---

## 🎉 You're Ready!

Your application is now running locally. Use Swagger UI at **http://localhost:3000/docs** to test all endpoints interactively!
