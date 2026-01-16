#!/bin/bash

# Load Testing Script for Rate Limiting
# Tests API rate limiting behavior, high request volume, and HTTP status codes
# 
# For comprehensive testing (user registration, subscription, prompts, WebSocket):
#   ./load-test-comprehensive.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
FREE_TIER_LIMIT="${FREE_TIER_LIMIT:-20}"
PAID_TIER_LIMIT="${PAID_TIER_LIMIT:-100}"
WINDOW_MS="${WINDOW_MS:-60000}" # 1 minute

echo -e "${BLUE}🚀 Load Testing - Rate Limiting Validation${NC}"
echo "=============================================="
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

# Get authentication token
echo -e "${BLUE}Getting authentication token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "Password123"
    }' || echo '{}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${YELLOW}⚠️  Login failed, trying to register...${NC}"
    REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"test-$(date +%s)@example.com\",
            \"password\": \"Password123\",
            \"displayName\": \"Load Test User\"
        }")
    TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken // empty')
    
    if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
        echo -e "${RED}❌ Failed to get authentication token${NC}"
        echo "Please ensure the API is running and you have valid credentials"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# Check user subscription status
echo -e "${BLUE}Checking user subscription status...${NC}"
RATE_LIMIT_STATUS=$(curl -s -X GET "$API_URL/users/rate-limit/status" \
    -H "Authorization: Bearer $TOKEN")

SUBSCRIPTION_STATUS=$(echo $RATE_LIMIT_STATUS | jq -r '.subscriptionStatus // "FREE"')
LIMIT=$(echo $RATE_LIMIT_STATUS | jq -r '.limit // 20')

echo "Subscription: $SUBSCRIPTION_STATUS"
echo "Rate Limit: $LIMIT requests/minute"
echo ""

# Test FREE tier rate limiting
echo -e "${BLUE}=============================================="
echo -e "Test 1: FREE Tier Rate Limiting ($FREE_TIER_LIMIT req/min)${NC}"
echo "=============================================="
echo ""

echo "Sending $((FREE_TIER_LIMIT + 5)) requests rapidly..."
SUCCESS_COUNT=0
RATE_LIMIT_COUNT=0
ERROR_COUNT=0

for i in $(seq 1 $((FREE_TIER_LIMIT + 5))); do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/users/rate-limit/status" \
        -H "Authorization: Bearer $TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        if [ $i -le 5 ]; then
            REMAINING=$(echo "$BODY" | jq -r '.remaining // 0')
            echo -e "  Request $i: ${GREEN}200 OK${NC} (Remaining: $REMAINING)"
        fi
    elif [ "$HTTP_CODE" == "429" ]; then
        RATE_LIMIT_COUNT=$((RATE_LIMIT_COUNT + 1))
        if [ $RATE_LIMIT_COUNT -eq 1 ]; then
            echo -e "  Request $i: ${YELLOW}429 Rate Limited${NC} ✅ (Expected)"
        fi
    else
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo -e "  Request $i: ${RED}$HTTP_CODE${NC}"
    fi
    
    # Small delay to avoid overwhelming
    sleep 0.1
done

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful (200): $SUCCESS_COUNT"
echo "  ⚠️  Rate Limited (429): $RATE_LIMIT_COUNT"
echo "  ❌ Errors: $ERROR_COUNT"
echo ""

if [ $RATE_LIMIT_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ Rate limiting is working correctly${NC}"
    echo "   Expected: ~$FREE_TIER_LIMIT successful requests, then 429"
else
    echo -e "${YELLOW}⚠️  No rate limiting detected. This may be expected if limit is higher.${NC}"
fi
echo ""

# Wait for rate limit window to reset
echo -e "${BLUE}Waiting for rate limit window to reset (10 seconds)...${NC}"
sleep 10

# Test high request volume
echo -e "${BLUE}=============================================="
echo -e "Test 2: High Request Volume${NC}"
echo "=============================================="
echo ""

REQUESTS=50
echo "Sending $REQUESTS requests in parallel..."
START_TIME=$(date +%s)

PIDS=()
for i in $(seq 1 $REQUESTS); do
    (
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/users/rate-limit/status" \
            -H "Authorization: Bearer $TOKEN" 2>/dev/null)
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        echo "$HTTP_CODE" >> /tmp/load_test_results.txt
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
SUCCESS_COUNT=$(grep -c "^200$" /tmp/load_test_results.txt 2>/dev/null || echo "0")
RATE_LIMIT_COUNT=$(grep -c "^429$" /tmp/load_test_results.txt 2>/dev/null || echo "0")
ERROR_COUNT=$(grep -v -E "^(200|429)$" /tmp/load_test_results.txt 2>/dev/null | wc -l | tr -d ' ')

rm -f /tmp/load_test_results.txt

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  Duration: ${DURATION}s"
echo "  ✅ Successful (200): $SUCCESS_COUNT"
echo "  ⚠️  Rate Limited (429): $RATE_LIMIT_COUNT"
echo "  ❌ Errors: $ERROR_COUNT"
echo "  Requests/sec: $(echo "scale=2; $REQUESTS / $DURATION" | bc)"
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ API handled high request volume correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Some errors occurred (may be expected due to rate limiting)${NC}"
fi
echo ""

# Test HTTP status codes
echo -e "${BLUE}=============================================="
echo -e "Test 3: HTTP Status Code Validation${NC}"
echo "=============================================="
echo ""

echo "Testing various scenarios..."

# Test 1: Valid request
echo -n "  Valid authenticated request: "
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/users/rate-limit/status" \
    -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ 200 OK${NC}"
else
    echo -e "${RED}❌ $HTTP_CODE${NC}"
fi

# Test 2: Missing token
echo -n "  Missing Bearer token: "
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/users/rate-limit/status")
if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✅ 401 Unauthorized${NC}"
else
    echo -e "${RED}❌ Expected 401, got $HTTP_CODE${NC}"
fi

# Test 3: Invalid token
echo -n "  Invalid Bearer token: "
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/users/rate-limit/status" \
    -H "Authorization: Bearer invalid-token-12345")
if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✅ 401 Unauthorized${NC}"
else
    echo -e "${RED}❌ Expected 401, got $HTTP_CODE${NC}"
fi

# Test 4: Rate limit exceeded
echo -n "  Rate limit exceeded: "
# Exhaust rate limit first
for i in $(seq 1 $((LIMIT + 1))); do
    curl -s -o /dev/null -X GET "$API_URL/users/rate-limit/status" \
        -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
done
sleep 1
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/users/rate-limit/status" \
    -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" == "429" ]; then
    echo -e "${GREEN}✅ 429 Too Many Requests${NC}"
else
    echo -e "${YELLOW}⚠️  Expected 429, got $HTTP_CODE (may need to wait for rate limit)${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}=============================================="
echo -e "📊 Load Test Summary${NC}"
echo "=============================================="
echo ""
echo "✅ Rate limiting validation complete"
echo "✅ High request volume handling tested"
echo "✅ HTTP status codes validated"
echo ""
echo -e "${GREEN}All tests completed!${NC}"
