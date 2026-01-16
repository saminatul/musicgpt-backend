# Prompt Processing Flow - Complete Implementation Guide

## 🔄 Complete Processing Flow

### 1. User Submits Prompt

**Endpoint**: `POST /prompts`

**Flow**:
```
User → PromptController → PromptService.create()
  ↓
1. Create Prompt record with status = PENDING
2. Return prompt to user
3. NO immediate job enqueueing (prevents duplicates)
```

**Status**: `PENDING`

---

### 2. Cron Scheduler Scans for Pending Prompts

**Schedule**: Every 30 seconds (`*/30 * * * * *`)

**Flow**:
```
CronScheduler.scanAndEnqueuePendingPrompts()
  ↓
1. Query database for prompts with status = PENDING (limit 50)
2. For each pending prompt:
   a. Get user subscription status
   b. Calculate priority:
      - PAID users: priority = 10
      - FREE users: priority = 1
   c. Enqueue job with prompt ID as jobId (prevents duplicates)
3. Log results
```

**Features**:
- ✅ Prevents duplicate jobs using `jobId = prompt-{promptId}`
- ✅ Priority-based enqueueing (PAID > FREE)
- ✅ Batch processing (up to 50 prompts per scan)
- ✅ Error handling per prompt

---

### 3. Background Worker Processes Jobs

**Worker**: `src/worker/main.ts`

**Flow**:
```
Worker receives job from queue
  ↓
PromptProcessor.processPrompt()
  ↓
1. Idempotency Check:
   - If status = COMPLETED → Check audio exists → Send notification → Return
   - If status = PROCESSING → Wait 2s → Recheck → Handle accordingly
   
2. Atomic Status Update:
   - Update status to PROCESSING
   
3. Simulate Audio Generation:
   - Random delay (2-5 seconds)
   
4. Create Audio Record:
   - Generate title and URL
   - Create audio entry (with idempotency check)
   
5. Atomic Status Update:
   - Update status to COMPLETED
   
6. WebSocket Notification:
   - Emit to user-specific room
   - Only after successful completion
```

**Status Transitions**:
- `PENDING` → `PROCESSING` → `COMPLETED`
- On error: `PROCESSING` → `PENDING` (for retry)

---

## 🛡️ Safety Features

### 1. Idempotency

- **Job Deduplication**: Uses `jobId = prompt-{promptId}` to prevent duplicate jobs
- **Status Checks**: Worker checks if prompt is already processed before processing
- **Audio Check**: Verifies audio doesn't already exist before creating

### 2. Atomic Operations

- **Status Updates**: Each status change is a single database operation
- **Transaction Safety**: Status updates happen before and after processing

### 3. Error Handling

- **Retry Logic**: Failed jobs are retried (3 attempts with exponential backoff)
- **Status Reset**: On error, status resets to PENDING for retry
- **Logging**: Comprehensive logging at each step

### 4. Race Condition Prevention

- **Job ID**: Prevents same prompt from being enqueued twice
- **Status Checks**: Worker checks status before processing
- **Wait and Recheck**: If PROCESSING, waits and rechecks

---

## 📊 Priority System

### Priority Levels

- **PAID Users**: Priority = 10 (processed first)
- **FREE Users**: Priority = 1 (processed after paid)

### How It Works

1. Cron scheduler checks user subscription status
2. Assigns priority based on subscription
3. BullMQ processes higher priority jobs first
4. Result: PAID users get faster processing

---

## 🔔 WebSocket Notifications

### Event: `prompt:completed`

**Emitted When**:
- Prompt status = COMPLETED
- Audio record created successfully
- Only after all operations succeed

**Payload**:
```json
{
  "promptId": "uuid",
  "audioId": "uuid",
  "title": "Audio for: ...",
  "url": "https://example.com/audio/...",
  "message": "Your prompt has been processed successfully"
}
```

**User-Specific**:
- Emitted to room: `user:{userId}`
- Only the prompt owner receives the notification

---

## 🧪 Testing the Flow

### 1. Create a Prompt

```bash
curl -X POST http://localhost:3000/prompts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Generate a relaxing jazz melody"}'
```

**Expected**:
- Prompt created with status = PENDING
- No immediate processing

### 2. Wait for Cron (30 seconds)

The cron job will:
- Scan for PENDING prompts
- Enqueue them with appropriate priority
- Log the enqueueing

**Check Logs**:
```
[PromptSchedulerService] Scanning for pending prompts...
[PromptSchedulerService] Found 1 pending prompts
[PromptSchedulerService] Enqueued prompt {id} (user: email, priority: 10, paid: true)
```

### 3. Worker Processes Job

**Check Worker Logs**:
```
[Worker] Processing job for prompt {id} (user: {userId}, paid: true)
[PromptProcessorService] Processing prompt {id} for user {userId}
[PromptProcessorService] Updating prompt {id} status to PROCESSING
[PromptProcessorService] Simulating audio generation for prompt {id} (3500ms delay)
[PromptProcessorService] Creating audio for prompt {id}
[PromptProcessorService] Updating prompt {id} status to COMPLETED
[PromptProcessorService] Sending WebSocket notification to user {userId}
[PromptProcessorService] Successfully processed prompt {id}
[Worker] ✅ Successfully processed prompt {id}
```

### 4. Verify Status

```bash
curl -X GET http://localhost:3000/prompts/{id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**:
- Status = COMPLETED
- Audio record exists

### 5. Check WebSocket Notification

Connect to WebSocket and listen for `prompt:completed` event.

---

## 🔍 Troubleshooting

### Issue: Prompts Not Being Processed

**Check**:
1. Is cron scheduler running? (check API logs)
2. Is worker running? (check worker logs)
3. Are there PENDING prompts in database?
4. Is Redis connected?

**Solution**:
```bash
# Check cron logs
docker-compose logs api | grep PromptScheduler

# Check worker logs
docker-compose logs worker

# Check database
npx prisma studio
```

### Issue: Duplicate Processing

**Check**:
- Job IDs should be unique (check Redis)
- Status should be checked before processing

**Solution**: Already implemented with jobId deduplication

### Issue: WebSocket Not Working

**Check**:
1. Is WebSocket gateway initialized?
2. Is user connected to correct room?
3. Check WebSocket service logs

**Solution**:
```bash
# Test WebSocket connection
# Connect to: ws://localhost:3000/notifications
# Join room: user:{userId}
```

---

## 📝 Key Implementation Details

### Job Queue Configuration

- **Queue Name**: `prompt-processing`
- **Concurrency**: 5 jobs at a time
- **Retries**: 3 attempts
- **Backoff**: Exponential (2s, 4s, 8s)
- **Job ID**: `prompt-{promptId}` (for deduplication)

### Status Flow

```
PENDING → PROCESSING → COMPLETED
   ↑                      ↓
   └── (on error) ────────┘
```

### Database Operations

- All status updates are atomic
- Audio creation includes existence check
- Transactions ensure consistency

---

## ✅ Verification Checklist

- [ ] Prompt created with PENDING status
- [ ] Cron scheduler finds pending prompts
- [ ] Jobs enqueued with correct priority
- [ ] Worker processes jobs
- [ ] Status updates to PROCESSING
- [ ] Audio record created
- [ ] Status updates to COMPLETED
- [ ] WebSocket notification sent
- [ ] No duplicate processing
- [ ] PAID users processed before FREE users

---

This implementation ensures scalable, reliable, and idempotent prompt processing with proper error handling and user notifications.
