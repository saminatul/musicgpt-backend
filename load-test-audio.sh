#!/bin/bash

# Comprehensive Load Testing Script for Audio
# Tests: List, get by ID, update, concurrent operations

# Don't exit on error - we want to continue testing even if some operations fail
set +e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
NUM_USERS="${NUM_USERS:-10}"
PROMPTS_PER_USER="${PROMPTS_PER_USER:-5}"
CONCURRENT_REQUESTS="${CONCURRENT_REQUESTS:-50}"
WAIT_FOR_PROCESSING="${WAIT_FOR_PROCESSING:-30}"

echo -e "${BLUE}🚀 Audio Load Testing${NC}"
echo "=============================================="
echo ""
echo "Configuration:"
echo "  Users: $NUM_USERS"
echo "  Prompts per user (to generate audio): $PROMPTS_PER_USER"
echo "  Concurrent requests: $CONCURRENT_REQUESTS"
echo "  Wait for processing: ${WAIT_FOR_PROCESSING}s"
echo "  API URL: $API_URL"
echo ""

# Check if API is running
echo -e "${BLUE}Checking API availability...${NC}"
if ! curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ API is not running at $API_URL${NC}"
    echo "Please start the API first: docker-compose up -d api"
    exit 1
fi
echo -e "${GREEN}✅ API is running${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required but not installed${NC}"
    echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Arrays to store user data
declare -a USER_TOKENS
declare -a USER_IDS
declare -a AUDIO_IDS

# Check if USER_TOKENS and USER_IDS are provided from comprehensive test
if [ -n "$USER_TOKENS" ] && [ -n "$USER_IDS" ]; then
    echo -e "${BLUE}=============================================="
    echo -e "Using tokens from comprehensive load test${NC}"
    echo "=============================================="
    echo ""
    
    # Convert comma-separated strings to arrays
    IFS=',' read -ra USER_TOKENS <<< "$USER_TOKENS"
    IFS=',' read -ra USER_IDS <<< "$USER_IDS"
    
    REGISTRATION_SUCCESS=${#USER_TOKENS[@]}
    NUM_USERS=${#USER_TOKENS[@]}
    
    echo -e "${GREEN}✅ Using $REGISTRATION_SUCCESS users from comprehensive test${NC}"
    echo ""
else
    # Register users
    echo -e "${BLUE}=============================================="
    echo -e "Step 1: User Registration ($NUM_USERS users)${NC}"
    echo "=============================================="
    echo ""
    
    REGISTRATION_SUCCESS=0
    START_TIME=$(date +%s)
    
    for i in $(seq 1 $NUM_USERS); do
        EMAIL="audio-loadtest-${i}-$(date +%s)@example.com"
        PASSWORD="Password123"
        DISPLAY_NAME="Audio Load Test User $i"
        
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\": \"$EMAIL\",
                \"password\": \"$PASSWORD\",
                \"displayName\": \"$DISPLAY_NAME\"
            }")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | head -n-1)
        
        if [ "$HTTP_CODE" == "201" ]; then
            TOKEN=$(echo "$BODY" | jq -r '.accessToken // empty')
            USER_ID=$(echo "$BODY" | jq -r '.user.id // empty')
            
            if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
                USER_TOKENS+=("$TOKEN")
                USER_IDS+=("$USER_ID")
                REGISTRATION_SUCCESS=$((REGISTRATION_SUCCESS + 1))
            fi
        fi
        
        sleep 0.1
    done
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo -e "${BLUE}Results:${NC}"
    echo "  ✅ Registered: $REGISTRATION_SUCCESS/$NUM_USERS"
    echo "  Duration: ${DURATION}s"
    echo ""
    
    if [ $REGISTRATION_SUCCESS -eq 0 ]; then
        echo -e "${RED}❌ No users registered. Cannot continue.${NC}"
        exit 1
    fi
fi

# Create prompts to generate audio
echo -e "${BLUE}=============================================="
echo -e "Step 2: Create Prompts to Generate Audio ($PROMPTS_PER_USER per user)${NC}"
echo "=============================================="
echo ""

PROMPT_CREATE_SUCCESS=0
START_TIME=$(date +%s)

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    
    for j in $(seq 1 $PROMPTS_PER_USER); do
        PROMPT_TEXT="Generate audio for load test prompt $j by user $((i + 1))"
        
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/prompts" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"$PROMPT_TEXT\"
            }")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        if [ "$HTTP_CODE" == "201" ]; then
            PROMPT_CREATE_SUCCESS=$((PROMPT_CREATE_SUCCESS + 1))
        fi
    done
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Prompts created: $PROMPT_CREATE_SUCCESS"
echo "  Duration: ${DURATION}s"
echo ""

# Wait for audio processing
echo -e "${BLUE}Waiting ${WAIT_FOR_PROCESSING} seconds for audio to be processed...${NC}"
sleep $WAIT_FOR_PROCESSING
echo ""

# Test 1: List audio files (GET /audio) with pagination
echo -e "${BLUE}=============================================="
echo -e "Test 1: List Audio Files (Pagination)${NC}"
echo "=============================================="
echo ""

AUDIO_LIST_SUCCESS=0
AUDIO_LIST_FAILED=0
TOTAL_AUDIO_FILES=0
START_TIME=$(date +%s)

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    
    # Test pagination: page 1
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/audio?page=1&limit=10" \
        -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        AUDIO_LIST_SUCCESS=$((AUDIO_LIST_SUCCESS + 1))
        # Extract audio IDs from response
        AUDIO_COUNT=$(echo "$BODY" | jq -r '.data | length // 0')
        TOTAL_AUDIO_FILES=$((TOTAL_AUDIO_FILES + AUDIO_COUNT))
        
        # Extract audio IDs
        for k in $(seq 0 $((AUDIO_COUNT - 1))); do
            AUDIO_ID=$(echo "$BODY" | jq -r ".data[$k].id // empty")
            if [ -n "$AUDIO_ID" ] && [ "$AUDIO_ID" != "null" ]; then
                AUDIO_IDS+=("$AUDIO_ID")
            fi
        done
    else
        AUDIO_LIST_FAILED=$((AUDIO_LIST_FAILED + 1))
    fi
    
    # Test pagination: page 2
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/audio?page=2&limit=10" \
        -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" == "200" ]; then
        AUDIO_LIST_SUCCESS=$((AUDIO_LIST_SUCCESS + 1))
        BODY=$(echo "$RESPONSE" | head -n-1)
        AUDIO_COUNT=$(echo "$BODY" | jq -r '.data | length // 0')
        TOTAL_AUDIO_FILES=$((TOTAL_AUDIO_FILES + AUDIO_COUNT))
        
        # Extract audio IDs
        for k in $(seq 0 $((AUDIO_COUNT - 1))); do
            AUDIO_ID=$(echo "$BODY" | jq -r ".data[$k].id // empty")
            if [ -n "$AUDIO_ID" ] && [ "$AUDIO_ID" != "null" ]; then
                AUDIO_IDS+=("$AUDIO_ID")
            fi
        done
    else
        AUDIO_LIST_FAILED=$((AUDIO_LIST_FAILED + 1))
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $AUDIO_LIST_SUCCESS"
echo "  ❌ Failed: $AUDIO_LIST_FAILED"
echo "  Total audio files found: $TOTAL_AUDIO_FILES"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $AUDIO_LIST_SUCCESS / $DURATION" | bc) requests/sec"
fi
echo ""

# Test 2: Get audio by ID
echo -e "${BLUE}=============================================="
echo -e "Test 2: Get Audio by ID${NC}"
echo "=============================================="
echo ""

AUDIO_GET_SUCCESS=0
AUDIO_GET_FAILED=0
START_TIME=$(date +%s)

# Test getting audio by ID (limit to first 50 to avoid too many requests)
TEST_LIMIT=$((TOTAL_AUDIO_FILES < 50 ? TOTAL_AUDIO_FILES : 50))

if [ ${#AUDIO_IDS[@]} -gt 0 ]; then
    for i in $(seq 0 $((TEST_LIMIT - 1))); do
        if [ $i -ge ${#AUDIO_IDS[@]} ]; then
            break
        fi
        
        AUDIO_ID="${AUDIO_IDS[$i]}"
        # Find which user owns this audio (use first user token for simplicity)
        TOKEN="${USER_TOKENS[0]}"
        
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/audio/$AUDIO_ID" \
            -H "Authorization: Bearer $TOKEN")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        if [ "$HTTP_CODE" == "200" ]; then
            AUDIO_GET_SUCCESS=$((AUDIO_GET_SUCCESS + 1))
        else
            AUDIO_GET_FAILED=$((AUDIO_GET_FAILED + 1))
        fi
    done
else
    echo -e "${YELLOW}⚠️  No audio files found. Skipping get by ID test.${NC}"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $AUDIO_GET_SUCCESS"
echo "  ❌ Failed: $AUDIO_GET_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ] && [ $AUDIO_GET_SUCCESS -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $AUDIO_GET_SUCCESS / $DURATION" | bc) requests/sec"
fi
echo ""

# Test 3: Update audio
echo -e "${BLUE}=============================================="
echo -e "Test 3: Update Audio${NC}"
echo "=============================================="
echo ""

AUDIO_UPDATE_SUCCESS=0
AUDIO_UPDATE_FAILED=0
START_TIME=$(date +%s)

# Test updating audio (limit to first 20 to avoid too many requests)
UPDATE_LIMIT=$((TOTAL_AUDIO_FILES < 20 ? TOTAL_AUDIO_FILES : 20))

if [ ${#AUDIO_IDS[@]} -gt 0 ]; then
    for i in $(seq 0 $((UPDATE_LIMIT - 1))); do
        if [ $i -ge ${#AUDIO_IDS[@]} ]; then
            break
        fi
        
        AUDIO_ID="${AUDIO_IDS[$i]}"
        # Find which user owns this audio (use first user token for simplicity)
        TOKEN="${USER_TOKENS[0]}"
        
        # Update audio with new title
        NEW_TITLE="Updated Audio Title $(date +%s)"
        RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/audio/$AUDIO_ID" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"title\": \"$NEW_TITLE\"
            }")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        if [ "$HTTP_CODE" == "200" ]; then
            AUDIO_UPDATE_SUCCESS=$((AUDIO_UPDATE_SUCCESS + 1))
        else
            AUDIO_UPDATE_FAILED=$((AUDIO_UPDATE_FAILED + 1))
        fi
    done
else
    echo -e "${YELLOW}⚠️  No audio files found. Skipping update test.${NC}"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $AUDIO_UPDATE_SUCCESS"
echo "  ❌ Failed: $AUDIO_UPDATE_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ] && [ $AUDIO_UPDATE_SUCCESS -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $AUDIO_UPDATE_SUCCESS / $DURATION" | bc) requests/sec"
fi
echo ""

# Test 4: Concurrent audio listing
echo -e "${BLUE}=============================================="
echo -e "Test 4: Concurrent Audio Listing ($CONCURRENT_REQUESTS requests)${NC}"
echo "=============================================="
echo ""

CONCURRENT_LIST_SUCCESS=0
CONCURRENT_LIST_FAILED=0
START_TIME=$(date +%s)

# Use first user token for concurrent test
TEST_TOKEN="${USER_TOKENS[0]}"

PIDS=()
rm -f /tmp/audio_list_concurrent_results.txt

for i in $(seq 1 $CONCURRENT_REQUESTS); do
    (
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/audio?page=1&limit=10" \
            -H "Authorization: Bearer $TEST_TOKEN" 2>/dev/null)
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        echo "$HTTP_CODE" >> /tmp/audio_list_concurrent_results.txt
    ) &
    PIDS+=($!)
done

# Wait for all requests to complete
for PID in "${PIDS[@]}"; do
    wait $PID
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Analyze results
CONCURRENT_LIST_SUCCESS=$(grep -c "^200$" /tmp/audio_list_concurrent_results.txt 2>/dev/null || echo "0")
CONCURRENT_LIST_FAILED=$(grep -v "^200$" /tmp/audio_list_concurrent_results.txt 2>/dev/null | wc -l | tr -d ' ')

rm -f /tmp/audio_list_concurrent_results.txt

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful (200): $CONCURRENT_LIST_SUCCESS"
echo "  ❌ Failed: $CONCURRENT_LIST_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $CONCURRENT_REQUESTS / $DURATION" | bc) requests/sec"
fi
echo ""

# Test 5: Concurrent get by ID (if we have audio files)
if [ ${#AUDIO_IDS[@]} -gt 0 ]; then
    echo -e "${BLUE}=============================================="
    echo -e "Test 5: Concurrent Get Audio by ID ($CONCURRENT_REQUESTS requests)${NC}"
    echo "=============================================="
    echo ""
    
    CONCURRENT_GET_SUCCESS=0
    CONCURRENT_GET_FAILED=0
    START_TIME=$(date +%s)
    
    PIDS=()
    rm -f /tmp/audio_get_concurrent_results.txt
    
    for i in $(seq 1 $CONCURRENT_REQUESTS); do
        # Cycle through available audio IDs
        AUDIO_INDEX=$((i % ${#AUDIO_IDS[@]}))
        AUDIO_ID="${AUDIO_IDS[$AUDIO_INDEX]}"
        
        (
            RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/audio/$AUDIO_ID" \
                -H "Authorization: Bearer $TEST_TOKEN" 2>/dev/null)
            
            HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
            echo "$HTTP_CODE" >> /tmp/audio_get_concurrent_results.txt
        ) &
        PIDS+=($!)
    done
    
    # Wait for all requests to complete
    for PID in "${PIDS[@]}"; do
        wait $PID
    done
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Analyze results
    CONCURRENT_GET_SUCCESS=$(grep -c "^200$" /tmp/audio_get_concurrent_results.txt 2>/dev/null || echo "0")
    CONCURRENT_GET_FAILED=$(grep -v "^200$" /tmp/audio_get_concurrent_results.txt 2>/dev/null | wc -l | tr -d ' ')
    
    rm -f /tmp/audio_get_concurrent_results.txt
    
    echo ""
    echo -e "${BLUE}Results:${NC}"
    echo "  ✅ Successful (200): $CONCURRENT_GET_SUCCESS"
    echo "  ❌ Failed: $CONCURRENT_GET_FAILED"
    echo "  Duration: ${DURATION}s"
    if [ $DURATION -gt 0 ]; then
        echo "  Rate: $(echo "scale=2; $CONCURRENT_REQUESTS / $DURATION" | bc) requests/sec"
    fi
    echo ""
fi

# Summary
echo -e "${BLUE}=============================================="
echo -e "📊 Audio Load Test Summary${NC}"
echo "=============================================="
echo ""
echo "Test Results:"
echo "  ✅ User Registration: $REGISTRATION_SUCCESS/$NUM_USERS"
echo "  ✅ Prompts Created: $PROMPT_CREATE_SUCCESS"
echo "  ✅ Audio Listing: $AUDIO_LIST_SUCCESS requests"
echo "  ✅ Get by ID: $AUDIO_GET_SUCCESS requests"
echo "  ✅ Update Audio: $AUDIO_UPDATE_SUCCESS requests"
echo "  ✅ Concurrent Listing: $CONCURRENT_LIST_SUCCESS/$CONCURRENT_REQUESTS"
if [ ${#AUDIO_IDS[@]} -gt 0 ]; then
    echo "  ✅ Concurrent Get by ID: $CONCURRENT_GET_SUCCESS/$CONCURRENT_REQUESTS"
fi
echo ""
echo "Total Operations:"
TOTAL_OPS=$((AUDIO_LIST_SUCCESS + AUDIO_GET_SUCCESS + AUDIO_UPDATE_SUCCESS + CONCURRENT_LIST_SUCCESS))
if [ ${#AUDIO_IDS[@]} -gt 0 ]; then
    TOTAL_OPS=$((TOTAL_OPS + CONCURRENT_GET_SUCCESS))
fi
echo "  Total API calls: ~$TOTAL_OPS"
echo ""
echo -e "${GREEN}✅ Audio load testing completed!${NC}"
echo ""
