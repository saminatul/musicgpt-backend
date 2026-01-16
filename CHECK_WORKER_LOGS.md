# How to Check Worker Logs

## 🐳 Docker Setup (Recommended)

### View Worker Logs

```bash
# View all worker logs
docker-compose logs worker

# Follow logs in real-time (live updates)
docker-compose logs -f worker

# View last 100 lines
docker-compose logs --tail=100 worker

# View logs with timestamps
docker-compose logs -t worker
```

### View Both API and Worker Logs

```bash
# View all services
docker-compose logs

# Follow all logs
docker-compose logs -f

# View specific services
docker-compose logs api worker
```

---

## 💻 Local Development

### If Running Worker Separately

**Terminal 1** (API):
```bash
npm run start:dev
```

**Terminal 2** (Worker):
```bash
npm run build
npm run worker
```

The worker logs will appear directly in Terminal 2.

### View Worker Process

```bash
# Check if worker is running
ps aux | grep "node.*worker"

# Or check node processes
ps aux | grep node
```

---

## 📊 What to Look For in Logs

### Normal Operation Logs

```
[Worker] Worker started. Processing jobs...
[Worker] Worker is ready to process jobs
[Worker] Processing job for prompt {id} (user: {userId}, paid: true)
[PromptProcessorService] Processing prompt {id} for user {userId}
[PromptProcessorService] Updating prompt {id} status to PROCESSING
[PromptProcessorService] Simulating audio generation for prompt {id} (3500ms delay)
[PromptProcessorService] Creating audio for prompt {id}
[PromptProcessorService] Updating prompt {id} status to COMPLETED
[PromptProcessorService] Sending WebSocket notification to user {userId}
[PromptProcessorService] Successfully processed prompt {id}
[Worker] ✅ Successfully processed prompt {id}
Job {jobId} completed
```

### Error Logs

```
[Worker] ❌ Error processing prompt {id}: Error message
Job {jobId} failed: Error message
[PromptProcessorService] Error processing prompt {id}: Error message
```

---

## 🔍 Useful Commands

### Filter Logs

```bash
# Show only processing logs
docker-compose logs worker | grep "Processing"

# Show only completed jobs
docker-compose logs worker | grep "Successfully processed"

# Show only errors
docker-compose logs worker | grep "Error\|failed"

# Show logs for specific prompt
docker-compose logs worker | grep "prompt-{promptId}"
```

### Real-time Monitoring

```bash
# Follow logs and filter for processing
docker-compose logs -f worker | grep --line-buffered "Processing\|completed\|Error"

# Follow all logs with timestamps
docker-compose logs -f -t
```

---

## 🐛 Troubleshooting

### Worker Not Running

```bash
# Check if worker container is running
docker-compose ps worker

# Check worker container status
docker-compose logs worker --tail=50

# Restart worker
docker-compose restart worker

# View worker container logs
docker logs musicpt_worker
```

### No Logs Appearing

```bash
# Check if worker is actually running
docker-compose ps

# Check if there are any jobs in queue
docker-compose exec redis redis-cli
> KEYS *prompt-processing*
> LLEN bull:prompt-processing:waiting
```

### Worker Crashed

```bash
# View crash logs
docker-compose logs worker --tail=100

# Restart worker
docker-compose restart worker

# Or rebuild and restart
docker-compose up -d --build worker
```

---

## 📈 Monitoring Worker Activity

### Check Queue Status

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check waiting jobs
LLEN bull:prompt-processing:waiting

# Check active jobs
LLEN bull:prompt-processing:active

# Check completed jobs
LLEN bull:prompt-processing:completed

# Check failed jobs
LLEN bull:prompt-processing:failed

# List all queue keys
KEYS bull:prompt-processing:*
```

### Check Worker Health

```bash
# View worker container stats
docker stats musicpt_worker

# Check worker container logs
docker logs musicpt_worker --tail=50 -f
```

---

## 🎯 Quick Commands Reference

```bash
# Most useful commands:

# 1. Follow worker logs in real-time
docker-compose logs -f worker

# 2. View last 50 lines
docker-compose logs --tail=50 worker

# 3. View logs with timestamps
docker-compose logs -t worker

# 4. View only errors
docker-compose logs worker | grep -i error

# 5. View processing activity
docker-compose logs -f worker | grep --line-buffered "Processing\|completed"
```

---

## 📝 Example Log Output

### Successful Processing

```
[Worker] Worker started. Processing jobs...
[Worker] Worker is ready to process jobs
[Worker] Processing job for prompt abc-123 (user: user-456, paid: true)
[PromptProcessorService] Processing prompt abc-123 for user user-456
[PromptProcessorService] Updating prompt abc-123 status to PROCESSING
[PromptProcessorService] Simulating audio generation for prompt abc-123 (3245ms delay)
[PromptProcessorService] Creating audio for prompt abc-123
[PromptProcessorService] Updating prompt abc-123 status to COMPLETED
[PromptProcessorService] Sending WebSocket notification to user user-456
[PromptProcessorService] Successfully processed prompt abc-123
[Worker] ✅ Successfully processed prompt abc-123
Job 12345 completed
```

### Error Scenario

```
[Worker] Processing job for prompt xyz-789 (user: user-123, paid: false)
[PromptProcessorService] Processing prompt xyz-789 for user user-123
[PromptProcessorService] Error processing prompt xyz-789: Database connection error
[Worker] ❌ Error processing prompt xyz-789: Database connection error
Job 12346 failed: Database connection error
```

---

## 🔧 Advanced: Log to File

### Save Logs to File

```bash
# Save logs to file
docker-compose logs worker > worker-logs.txt

# Save with timestamps
docker-compose logs -t worker > worker-logs-timestamped.txt

# Append to file (for continuous logging)
docker-compose logs -f worker >> worker-logs.txt
```

---

Use these commands to monitor your worker and debug any issues with prompt processing!
