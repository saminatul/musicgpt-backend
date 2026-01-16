#!/bin/bash

# Comprehensive Load Testing Script for Subscriptions
# Tests: Subscribe, cancel, status checks, concurrent operations

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
NUM_USERS="${NUM_USERS:-20}"
REQUESTS_PER_USER="${REQUESTS_PER_USER:-10}"
CONCURRENT_REQUESTS="${CONCURRENT_REQUESTS:-50}"

echo -e "${BLUE}🚀 Subscription Load Testing${NC}"
echo "=============================================="
echo ""
echo "Configuration:"
echo "  Users: $NUM_USERS"
echo "  Requests per user: $REQUESTS_PER_USER"
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
        EMAIL="sub-loadtest-${i}-$(date +%s)@example.com"
        PASSWORD="Password123"
        DISPLAY_NAME="Subscription Load Test User $i"
        
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

# Test 1: Subscribe users
echo -e "${BLUE}=============================================="
echo -e "Test 1: Subscribe Users${NC}"
echo "=============================================="
echo ""

SUBSCRIBE_SUCCESS=0
SUBSCRIBE_FAILED=0
START_TIME=$(date +%s)

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/subscription/subscribe" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
        SUBSCRIBE_SUCCESS=$((SUBSCRIBE_SUCCESS + 1))
    else
        SUBSCRIBE_FAILED=$((SUBSCRIBE_FAILED + 1))
    fi
    
    if [ $((i + 1)) -le 5 ]; then
        echo -e "  User $((i + 1)): Subscribe ${GREEN}✅${NC}"
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $SUBSCRIBE_SUCCESS"
echo "  ❌ Failed: $SUBSCRIBE_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $SUBSCRIBE_SUCCESS / $DURATION" | bc) subscriptions/sec"
fi
echo ""

# Test 2: Check subscription status and rate limits
echo -e "${BLUE}=============================================="
echo -e "Test 2: Check Subscription Status ($REQUESTS_PER_USER per user)${NC}"
echo "=============================================="
echo ""

STATUS_CHECK_SUCCESS=0
STATUS_CHECK_FAILED=0
START_TIME=$(date +%s)

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    USER_ID="${USER_IDS[$i]}"
    
    for j in $(seq 1 $REQUESTS_PER_USER); do
        # Check rate limit status (should show PAID tier after subscription)
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/users/rate-limit/status" \
            -H "Authorization: Bearer $TOKEN")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        if [ "$HTTP_CODE" == "200" ]; then
            STATUS_CHECK_SUCCESS=$((STATUS_CHECK_SUCCESS + 1))
        else
            STATUS_CHECK_FAILED=$((STATUS_CHECK_FAILED + 1))
        fi
        
        # Check user info (includes subscription status)
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/users/$USER_ID" \
            -H "Authorization: Bearer $TOKEN")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        if [ "$HTTP_CODE" == "200" ]; then
            STATUS_CHECK_SUCCESS=$((STATUS_CHECK_SUCCESS + 1))
        else
            STATUS_CHECK_FAILED=$((STATUS_CHECK_FAILED + 1))
        fi
    done
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $STATUS_CHECK_SUCCESS"
echo "  ❌ Failed: $STATUS_CHECK_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $STATUS_CHECK_SUCCESS / $DURATION" | bc) requests/sec"
fi
echo ""

# Test 3: Cancel subscriptions
echo -e "${BLUE}=============================================="
echo -e "Test 3: Cancel Subscriptions${NC}"
echo "=============================================="
echo ""

CANCEL_SUCCESS=0
CANCEL_FAILED=0
START_TIME=$(date +%s)

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/subscription/cancel" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
        CANCEL_SUCCESS=$((CANCEL_SUCCESS + 1))
    else
        CANCEL_FAILED=$((CANCEL_FAILED + 1))
    fi
    
    if [ $((i + 1)) -le 5 ]; then
        echo -e "  User $((i + 1)): Cancel ${GREEN}✅${NC}"
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $CANCEL_SUCCESS"
echo "  ❌ Failed: $CANCEL_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $CANCEL_SUCCESS / $DURATION" | bc) cancellations/sec"
fi
echo ""

# Test 4: Concurrent subscription operations
echo -e "${BLUE}=============================================="
echo -e "Test 4: Concurrent Subscribe Operations ($CONCURRENT_REQUESTS requests)${NC}"
echo "=============================================="
echo ""

CONCURRENT_SUBSCRIBE_SUCCESS=0
CONCURRENT_SUBSCRIBE_FAILED=0
START_TIME=$(date +%s)

# Use first few user tokens for concurrent test
PIDS=()
rm -f /tmp/sub_concurrent_results.txt

for i in $(seq 0 $((CONCURRENT_REQUESTS - 1))); do
    TOKEN_INDEX=$((i % ${#USER_TOKENS[@]}))
    TOKEN="${USER_TOKENS[$TOKEN_INDEX]}"
    
    (
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/subscription/subscribe" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" 2>/dev/null)
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        echo "$HTTP_CODE" >> /tmp/sub_concurrent_results.txt
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
CONCURRENT_SUBSCRIBE_SUCCESS=$(grep -E "^(200|201)$" /tmp/sub_concurrent_results.txt 2>/dev/null | wc -l | tr -d ' ')
CONCURRENT_SUBSCRIBE_FAILED=$(grep -v -E "^(200|201)$" /tmp/sub_concurrent_results.txt 2>/dev/null | wc -l | tr -d ' ')

rm -f /tmp/sub_concurrent_results.txt

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful (200/201): $CONCURRENT_SUBSCRIBE_SUCCESS"
echo "  ❌ Failed: $CONCURRENT_SUBSCRIBE_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $CONCURRENT_REQUESTS / $DURATION" | bc) requests/sec"
fi
echo ""

# Test 5: Concurrent status checks
echo -e "${BLUE}=============================================="
echo -e "Test 5: Concurrent Status Checks ($CONCURRENT_REQUESTS requests)${NC}"
echo "=============================================="
echo ""

CONCURRENT_STATUS_SUCCESS=0
CONCURRENT_STATUS_FAILED=0
START_TIME=$(date +%s)

PIDS=()
rm -f /tmp/status_concurrent_results.txt

for i in $(seq 1 $CONCURRENT_REQUESTS); do
    TOKEN_INDEX=$((i % ${#USER_TOKENS[@]}))
    TOKEN="${USER_TOKENS[$TOKEN_INDEX]}"
    
    (
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/users/rate-limit/status" \
            -H "Authorization: Bearer $TOKEN" 2>/dev/null)
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        echo "$HTTP_CODE" >> /tmp/status_concurrent_results.txt
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
CONCURRENT_STATUS_SUCCESS=$(grep -c "^200$" /tmp/status_concurrent_results.txt 2>/dev/null || echo "0")
CONCURRENT_STATUS_FAILED=$(grep -v "^200$" /tmp/status_concurrent_results.txt 2>/dev/null | wc -l | tr -d ' ')

rm -f /tmp/status_concurrent_results.txt

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful (200): $CONCURRENT_STATUS_SUCCESS"
echo "  ❌ Failed: $CONCURRENT_STATUS_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $CONCURRENT_REQUESTS / $DURATION" | bc) requests/sec"
fi
echo ""

# Test 6: Subscribe/Cancel cycle
echo -e "${BLUE}=============================================="
echo -e "Test 6: Subscribe/Cancel Cycle (5 cycles per user)${NC}"
echo "=============================================="
echo ""

CYCLE_SUCCESS=0
CYCLE_FAILED=0
START_TIME=$(date +%s)

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    
    for cycle in $(seq 1 5); do
        # Subscribe
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/subscription/subscribe" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
            CYCLE_SUCCESS=$((CYCLE_SUCCESS + 1))
        else
            CYCLE_FAILED=$((CYCLE_FAILED + 1))
        fi
        
        # Cancel
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/subscription/cancel" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
            CYCLE_SUCCESS=$((CYCLE_SUCCESS + 1))
        else
            CYCLE_FAILED=$((CYCLE_FAILED + 1))
        fi
    done
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $CYCLE_SUCCESS"
echo "  ❌ Failed: $CYCLE_FAILED"
echo "  Duration: ${DURATION}s"
if [ $DURATION -gt 0 ]; then
    echo "  Rate: $(echo "scale=2; $CYCLE_SUCCESS / $DURATION" | bc) operations/sec"
fi
echo ""

# Summary
echo -e "${BLUE}=============================================="
echo -e "📊 Subscription Load Test Summary${NC}"
echo "=============================================="
echo ""
echo "Test Results:"
echo "  ✅ User Registration: $REGISTRATION_SUCCESS/$NUM_USERS"
echo "  ✅ Subscribe: $SUBSCRIBE_SUCCESS subscriptions"
echo "  ✅ Status Checks: $STATUS_CHECK_SUCCESS requests"
echo "  ✅ Cancel: $CANCEL_SUCCESS cancellations"
echo "  ✅ Concurrent Subscribe: $CONCURRENT_SUBSCRIBE_SUCCESS/$CONCURRENT_REQUESTS"
echo "  ✅ Concurrent Status: $CONCURRENT_STATUS_SUCCESS/$CONCURRENT_REQUESTS"
echo "  ✅ Subscribe/Cancel Cycles: $CYCLE_SUCCESS operations"
echo ""
echo "Total Operations:"
TOTAL_OPS=$((SUBSCRIBE_SUCCESS + STATUS_CHECK_SUCCESS + CANCEL_SUCCESS + CONCURRENT_SUBSCRIBE_SUCCESS + CONCURRENT_STATUS_SUCCESS + CYCLE_SUCCESS))
echo "  Total API calls: ~$TOTAL_OPS"
echo ""
echo -e "${GREEN}✅ Subscription load testing completed!${NC}"
echo ""
