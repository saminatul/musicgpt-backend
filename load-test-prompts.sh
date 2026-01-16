#!/bin/bash

# Comprehensive Load Testing Script for Prompts
# Tests: Create, list, get by ID, pagination, concurrent operations

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
PROMPTS_PER_USER="${PROMPTS_PER_USER:-20}"
CONCURRENT_REQUESTS="${CONCURRENT_REQUESTS:-50}"

echo -e "${BLUE}🚀 Prompts Load Testing${NC}"
echo "=============================================="
echo ""
echo "Configuration:"
echo "  Users: $NUM_USERS"
echo "  Prompts per user: $PROMPTS_PER_USER"
echo "  Concurrent requests: $CONCURRENT_REQUESTS"
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
declare -a PROMPT_IDS

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
        EMAIL="prompt-loadtest-${i}-$(date +%s)@example.com"
        PASSWORD="Password123"
        DISPLAY_NAME="Prompt Load Test User $i"
        
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

# Test 1: Create prompts
echo -e "${BLUE}=============================================="
echo -e "Test 1: Create Prompts ($PROMPTS_PER_USER per user)${NC}"
echo "=============================================="
echo ""

PROMPT_CREATE_SUCCESS=0
PROMPT_CREATE_FAILED=0
START_TIME=$(date +%s)

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    
    for j in $(seq 1 $PROMPTS_PER_USER); do
        PROMPT_TEXT="Load test prompt $j by user $((i + 1)) - $(date +%s)"
        
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/prompts" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"$PROMPT_TEXT\"
            }")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | head -n-1)
        
        if [ "$HTTP_CODE" == "201" ]; then
            PROMPT_ID=$(echo "$BODY" | jq -r '.id // empty')
            if [ -n "$PROMPT_ID" ] && [ "$PROMPT_ID" != "null" ]; then
                PROMPT_IDS+=("$PROMPT_ID")
                PROMPT_CREATE_SUCCESS=$((PROMPT_CREATE_SUCCESS + 1))
            else
                PROMPT_CREATE_FAILED=$((PROMPT_CREATE_FAILED + 1))
            fi
        else
            PROMPT_CREATE_FAILED=$((PROMPT_CREATE_FAILED + 1))
        fi
    done
    
    if [ $((i + 1)) -le 3 ]; then
        echo -e "  User $((i + 1)): Created $PROMPTS_PER_USER prompts"
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $PROMPT_CREATE_SUCCESS"
echo "  ❌ Failed: $PROMPT_CREATE_FAILED"
echo "  Total prompts: ${#PROMPT_IDS[@]}"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $PROMPT_CREATE_SUCCESS / $DURATION" | bc) prompts/sec"
fi
echo ""

# Test 2: List prompts (GET /prompts) with pagination
echo -e "${BLUE}=============================================="
echo -e "Test 2: List Prompts (Pagination)${NC}"
echo "=============================================="
echo ""

PROMPT_LIST_SUCCESS=0
PROMPT_LIST_FAILED=0
START_TIME=$(date +%s)

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    
    # Test pagination: page 1
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/prompts?page=1&limit=10" \
        -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" == "200" ]; then
        PROMPT_LIST_SUCCESS=$((PROMPT_LIST_SUCCESS + 1))
    else
        PROMPT_LIST_FAILED=$((PROMPT_LIST_FAILED + 1))
    fi
    
    # Test pagination: page 2
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/prompts?page=2&limit=10" \
        -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" == "200" ]; then
        PROMPT_LIST_SUCCESS=$((PROMPT_LIST_SUCCESS + 1))
    else
        PROMPT_LIST_FAILED=$((PROMPT_LIST_FAILED + 1))
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $PROMPT_LIST_SUCCESS"
echo "  ❌ Failed: $PROMPT_LIST_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $PROMPT_LIST_SUCCESS / $DURATION" | bc) requests/sec"
fi
echo ""

# Test 3: Get prompt by ID
echo -e "${BLUE}=============================================="
echo -e "Test 3: Get Prompt by ID${NC}"
echo "=============================================="
echo ""

PROMPT_GET_SUCCESS=0
PROMPT_GET_FAILED=0
START_TIME=$(date +%s)

# Test getting prompts by ID (limit to first 50 to avoid too many requests)
TEST_LIMIT=$((PROMPT_CREATE_SUCCESS < 50 ? PROMPT_CREATE_SUCCESS : 50))

for i in $(seq 0 $((TEST_LIMIT - 1))); do
    if [ $i -ge ${#PROMPT_IDS[@]} ]; then
        break
    fi
    
    PROMPT_ID="${PROMPT_IDS[$i]}"
    # Find which user owns this prompt (use first user token for simplicity)
    TOKEN="${USER_TOKENS[0]}"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/prompts/$PROMPT_ID" \
        -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" == "200" ]; then
        PROMPT_GET_SUCCESS=$((PROMPT_GET_SUCCESS + 1))
    else
        PROMPT_GET_FAILED=$((PROMPT_GET_FAILED + 1))
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $PROMPT_GET_SUCCESS"
echo "  ❌ Failed: $PROMPT_GET_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $PROMPT_GET_SUCCESS / $DURATION" | bc) requests/sec"
fi
echo ""

# Test 4: Concurrent prompt creation
echo -e "${BLUE}=============================================="
echo -e "Test 4: Concurrent Prompt Creation ($CONCURRENT_REQUESTS requests)${NC}"
echo "=============================================="
echo ""

CONCURRENT_SUCCESS=0
CONCURRENT_FAILED=0
START_TIME=$(date +%s)

# Use first user token for concurrent test
TEST_TOKEN="${USER_TOKENS[0]}"

PIDS=()
rm -f /tmp/prompt_concurrent_results.txt

for i in $(seq 1 $CONCURRENT_REQUESTS); do
    (
        PROMPT_TEXT="Concurrent prompt $i - $(date +%s%N)"
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/prompts" \
            -H "Authorization: Bearer $TEST_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"$PROMPT_TEXT\"
            }" 2>/dev/null)
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        echo "$HTTP_CODE" >> /tmp/prompt_concurrent_results.txt
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
CONCURRENT_SUCCESS=$(grep -c "^201$" /tmp/prompt_concurrent_results.txt 2>/dev/null || echo "0")
CONCURRENT_FAILED=$(grep -v "^201$" /tmp/prompt_concurrent_results.txt 2>/dev/null | wc -l | tr -d ' ')

rm -f /tmp/prompt_concurrent_results.txt

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful (201): $CONCURRENT_SUCCESS"
echo "  ❌ Failed: $CONCURRENT_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $CONCURRENT_REQUESTS / $DURATION" | bc) requests/sec"
fi
echo ""

# Test 5: Concurrent prompt listing
echo -e "${BLUE}=============================================="
echo -e "Test 5: Concurrent Prompt Listing ($CONCURRENT_REQUESTS requests)${NC}"
echo "=============================================="
echo ""

CONCURRENT_LIST_SUCCESS=0
CONCURRENT_LIST_FAILED=0
START_TIME=$(date +%s)

PIDS=()
rm -f /tmp/prompt_list_concurrent_results.txt

for i in $(seq 1 $CONCURRENT_REQUESTS); do
    (
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/prompts?page=1&limit=10" \
            -H "Authorization: Bearer $TEST_TOKEN" 2>/dev/null)
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        echo "$HTTP_CODE" >> /tmp/prompt_list_concurrent_results.txt
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
CONCURRENT_LIST_SUCCESS=$(grep -c "^200$" /tmp/prompt_list_concurrent_results.txt 2>/dev/null || echo "0")
CONCURRENT_LIST_FAILED=$(grep -v "^200$" /tmp/prompt_list_concurrent_results.txt 2>/dev/null | wc -l | tr -d ' ')

rm -f /tmp/prompt_list_concurrent_results.txt

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful (200): $CONCURRENT_LIST_SUCCESS"
echo "  ❌ Failed: $CONCURRENT_LIST_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $CONCURRENT_REQUESTS / $DURATION" | bc) requests/sec"
fi
echo ""

# Summary
echo -e "${BLUE}=============================================="
echo -e "📊 Prompts Load Test Summary${NC}"
echo "=============================================="
echo ""
echo "Test Results:"
echo "  ✅ User Registration: $REGISTRATION_SUCCESS/$NUM_USERS"
echo "  ✅ Prompt Creation: $PROMPT_CREATE_SUCCESS created"
echo "  ✅ Prompt Listing: $PROMPT_LIST_SUCCESS requests"
echo "  ✅ Get by ID: $PROMPT_GET_SUCCESS requests"
echo "  ✅ Concurrent Creation: $CONCURRENT_SUCCESS/$CONCURRENT_REQUESTS"
echo "  ✅ Concurrent Listing: $CONCURRENT_LIST_SUCCESS/$CONCURRENT_REQUESTS"
echo ""
echo "Total Operations:"
TOTAL_OPS=$((PROMPT_CREATE_SUCCESS + PROMPT_LIST_SUCCESS + PROMPT_GET_SUCCESS + CONCURRENT_SUCCESS + CONCURRENT_LIST_SUCCESS))
echo "  Total API calls: ~$TOTAL_OPS"
echo ""
echo -e "${GREEN}✅ Prompts load testing completed!${NC}"
echo ""
