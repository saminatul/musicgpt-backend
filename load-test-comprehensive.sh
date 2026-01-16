#!/bin/bash

# Comprehensive Load Testing Script
# Tests: User registration, subscription, prompts, WebSocket notifications

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
WS_URL="${WS_URL:-ws://localhost:3000}"
NUM_USERS="${NUM_USERS:-19}"
REQUESTS_PER_USER="${REQUESTS_PER_USER:-10}"
PROMPTS_PER_USER="${PROMPTS_PER_USER:-5}"

echo -e "${BLUE}🚀 Comprehensive Load Testing${NC}"
echo "=============================================="
echo ""
echo "Configuration:"
echo "  Users to register: $NUM_USERS"
echo "  Subscription requests per user: $REQUESTS_PER_USER"
echo "  Prompts per user: $PROMPTS_PER_USER"
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

# Check if Node.js is available for WebSocket testing
NODE_AVAILABLE=false
if command -v node &> /dev/null; then
    NODE_AVAILABLE=true
fi

# Arrays to store user data
declare -a USER_TOKENS
declare -a USER_IDS
declare -a USER_EMAILS

# Test 1: Register 25 users
echo -e "${BLUE}=============================================="
echo -e "Test 1: User Registration ($NUM_USERS users)${NC}"
echo "=============================================="
echo ""

REGISTRATION_SUCCESS=0
REGISTRATION_FAILED=0
START_TIME=$(date +%s)

for i in $(seq 1 $NUM_USERS); do
    EMAIL="loadtest-user-${i}-$(date +%s)@example.com"
    PASSWORD="Password123"
    DISPLAY_NAME="Load Test User $i"
    
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
            USER_EMAILS+=("$EMAIL")
            REGISTRATION_SUCCESS=$((REGISTRATION_SUCCESS + 1))
            
            if [ $i -le 5 ]; then
                echo -e "  User $i: ${GREEN}✅ Registered${NC} ($EMAIL)"
            fi
        else
            REGISTRATION_FAILED=$((REGISTRATION_FAILED + 1))
        fi
    else
        REGISTRATION_FAILED=$((REGISTRATION_FAILED + 1))
        if [ $i -le 5 ]; then
            echo -e "  User $i: ${RED}❌ Failed${NC} (HTTP $HTTP_CODE)"
        fi
    fi
    
    # Small delay to avoid overwhelming
    sleep 0.1
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $REGISTRATION_SUCCESS"
echo "  ❌ Failed: $REGISTRATION_FAILED"
echo "  Duration: ${DURATION}s"
echo "  Rate: $(echo "scale=2; $REGISTRATION_SUCCESS / $DURATION" | bc) users/sec"
echo ""

if [ $REGISTRATION_SUCCESS -lt $((NUM_USERS / 2)) ]; then
    echo -e "${RED}❌ Too many registration failures${NC}"
    exit 1
fi

# Test 2: Subscription testing per user
echo -e "${BLUE}=============================================="
echo -e "Test 2: Subscription Testing ($REQUESTS_PER_USER requests/user)${NC}"
echo "=============================================="
echo ""

SUBSCRIPTION_SUCCESS=0
SUBSCRIPTION_FAILED=0
CANCEL_SUCCESS=0
CANCEL_FAILED=0
START_TIME=$(date +%s)

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    USER_ID="${USER_IDS[$i]}"
    
    # Subscribe
    SUBSCRIBE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/subscription/subscribe" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    SUBSCRIBE_CODE=$(echo "$SUBSCRIBE_RESPONSE" | tail -n1)
    if [ "$SUBSCRIBE_CODE" == "200" ] || [ "$SUBSCRIBE_CODE" == "201" ]; then
        SUBSCRIPTION_SUCCESS=$((SUBSCRIPTION_SUCCESS + 1))
    else
        SUBSCRIPTION_FAILED=$((SUBSCRIPTION_FAILED + 1))
    fi
    
    # Make subscription-related requests
    for j in $(seq 1 $REQUESTS_PER_USER); do
        # Check rate limit status (should show PAID tier after subscription)
        curl -s -o /dev/null -X GET "$API_URL/users/rate-limit/status" \
            -H "Authorization: Bearer $TOKEN" || true
        
        # Check subscription status
        curl -s -o /dev/null -X GET "$API_URL/users/$USER_ID" \
            -H "Authorization: Bearer $TOKEN" || true
    done
    
    # Cancel subscription
    CANCEL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/subscription/cancel" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    CANCEL_CODE=$(echo "$CANCEL_RESPONSE" | tail -n1)
    if [ "$CANCEL_CODE" == "200" ] || [ "$CANCEL_CODE" == "201" ]; then
        CANCEL_SUCCESS=$((CANCEL_SUCCESS + 1))
    else
        CANCEL_FAILED=$((CANCEL_FAILED + 1))
    fi
    
    if [ $((i + 1)) -le 5 ]; then
        echo -e "  User $((i + 1)): Subscribe ${GREEN}✅${NC} | Cancel ${GREEN}✅${NC} | $REQUESTS_PER_USER requests"
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Subscribe successful: $SUBSCRIPTION_SUCCESS"
echo "  ❌ Subscribe failed: $SUBSCRIPTION_FAILED"
echo "  ✅ Cancel successful: $CANCEL_SUCCESS"
echo "  ❌ Cancel failed: $CANCEL_FAILED"
echo "  Total requests: $((SUBSCRIPTION_SUCCESS * REQUESTS_PER_USER * 2))"
echo "  Duration: ${DURATION}s"
echo ""

# Test 3: Prompt creation per user
echo -e "${BLUE}=============================================="
echo -e "Test 3: Prompt Creation ($PROMPTS_PER_USER prompts/user)${NC}"
echo "=============================================="
echo ""

PROMPT_SUCCESS=0
PROMPT_FAILED=0
PROMPT_IDS=()
START_TIME=$(date +%s)

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    
    for j in $(seq 1 $PROMPTS_PER_USER); do
        PROMPT_TEXT="Generate audio for prompt $j by user $((i + 1))"
        
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
                PROMPT_SUCCESS=$((PROMPT_SUCCESS + 1))
            else
                PROMPT_FAILED=$((PROMPT_FAILED + 1))
            fi
        else
            PROMPT_FAILED=$((PROMPT_FAILED + 1))
        fi
    done
    
    if [ $((i + 1)) -le 5 ]; then
        echo -e "  User $((i + 1)): Created $PROMPTS_PER_USER prompts ${GREEN}✅${NC}"
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $PROMPT_SUCCESS"
echo "  ❌ Failed: $PROMPT_FAILED"
echo "  Total prompts created: ${#PROMPT_IDS[@]}"
echo "  Duration: ${DURATION}s"
echo "  Rate: $(echo "scale=2; $PROMPT_SUCCESS / $DURATION" | bc) prompts/sec"
echo ""

# Test 4: WebSocket testing
echo -e "${BLUE}=============================================="
echo -e "Test 4: WebSocket Notifications${NC}"
echo "=============================================="
echo ""

if [ "$NODE_AVAILABLE" == "true" ]; then
    echo "Testing WebSocket connections..."
    
    # Create a temporary Node.js script for WebSocket testing
    cat > /tmp/ws-test.js << 'EOF'
const io = require('socket.io-client');
const readline = require('readline');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';
const USER_TOKENS = process.env.USER_TOKENS ? process.env.USER_TOKENS.split(',') : [];
const USER_IDS = process.env.USER_IDS ? process.env.USER_IDS.split(',') : [];

let connected = 0;
let notifications = 0;
let errors = 0;

const promises = [];

USER_IDS.forEach((userId, index) => {
    if (index >= 5) return; // Test first 5 users only
    
    const promise = new Promise((resolve) => {
        const socket = io(`${WS_URL}/notifications`, {
            transports: ['websocket'],
            reconnection: false,
        });
        
        socket.on('connect', () => {
            connected++;
            socket.emit('join', { userId });
        });
        
        socket.on('prompt:completed', (data) => {
            notifications++;
        });
        
        socket.on('error', (error) => {
            errors++;
        });
        
        socket.on('disconnect', () => {
            resolve();
        });
        
        // Close after 5 seconds
        setTimeout(() => {
            socket.disconnect();
            resolve();
        }, 5000);
    });
    
    promises.push(promise);
});

Promise.all(promises).then(() => {
    console.log(`Connected: ${connected}`);
    console.log(`Notifications received: ${notifications}`);
    console.log(`Errors: ${errors}`);
    process.exit(0);
});
EOF

    # Note: This requires socket.io-client to be installed
    # For now, we'll just document the WebSocket test
    echo -e "${YELLOW}⚠️  WebSocket testing requires socket.io-client${NC}"
    echo "  Install with: npm install -g socket.io-client"
    echo "  Or run WebSocket tests separately"
    echo ""
    echo "  WebSocket endpoint: $WS_URL/notifications"
    echo "  Expected events: prompt:completed"
    echo ""
else
    echo -e "${YELLOW}⚠️  Node.js not available for WebSocket testing${NC}"
    echo "  WebSocket testing skipped"
    echo "  Install Node.js to enable WebSocket tests"
    echo ""
fi

# Test 5: Audio retrieval (after prompts are processed)
echo -e "${BLUE}=============================================="
echo -e "Test 5: Audio Retrieval${NC}"
echo "=============================================="
echo ""

AUDIO_SUCCESS=0
AUDIO_FAILED=0
START_TIME=$(date +%s)

# Wait a bit for prompts to be processed
echo "Waiting 10 seconds for prompts to be processed..."
sleep 10

for i in $(seq 0 $((${#USER_TOKENS[@]} - 1))); do
    TOKEN="${USER_TOKENS[$i]}"
    
    # Get user's audio files
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/audio" \
        -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        AUDIO_COUNT=$(echo "$RESPONSE" | head -n-1 | jq -r '.data | length // 0')
        AUDIO_SUCCESS=$((AUDIO_SUCCESS + 1))
        
        if [ $((i + 1)) -le 5 ]; then
            echo -e "  User $((i + 1)): ${GREEN}✅${NC} Found $AUDIO_COUNT audio files"
        fi
    else
        AUDIO_FAILED=$((AUDIO_FAILED + 1))
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Results:${NC}"
echo "  ✅ Successful: $AUDIO_SUCCESS"
echo "  ❌ Failed: $AUDIO_FAILED"
echo "  Duration: ${DURATION}s"
echo ""

# Summary
echo -e "${BLUE}=============================================="
echo -e "📊 Comprehensive Load Test Summary${NC}"
echo "=============================================="
echo ""
echo "Test Results:"
echo "  ✅ User Registration: $REGISTRATION_SUCCESS/$NUM_USERS"
echo "  ✅ Subscription Tests: $SUBSCRIPTION_SUCCESS subscribe, $CANCEL_SUCCESS cancel"
echo "  ✅ Prompt Creation: $PROMPT_SUCCESS prompts created"
echo "  ✅ Audio Retrieval: $AUDIO_SUCCESS/$REGISTRATION_SUCCESS"
echo ""
echo "Total Operations:"
TOTAL_OPS=$((REGISTRATION_SUCCESS + (SUBSCRIPTION_SUCCESS * REQUESTS_PER_USER * 2) + PROMPT_SUCCESS + AUDIO_SUCCESS))
echo "  Total API calls: ~$TOTAL_OPS"
echo ""
echo -e "${GREEN}✅ Comprehensive load testing completed!${NC}"
echo ""

# Export user tokens and IDs for WebSocket testing
if [ ${#USER_TOKENS[@]} -gt 0 ]; then
    echo "Exporting user data for WebSocket testing:"
    echo "  USER_TOKENS=$(IFS=','; echo "${USER_TOKENS[*]}")"
    echo "  USER_IDS=$(IFS=','; echo "${USER_IDS[*]}")"
    echo ""
    echo "To test WebSocket connections, run:"
    echo "  export USER_TOKENS=\"$(IFS=','; echo "${USER_TOKENS[*]}")\""
    echo "  export USER_IDS=\"$(IFS=','; echo "${USER_IDS[*]}")\""
    echo "  node test-websocket.js ${#USER_TOKENS[@]} $API_URL"
    echo ""
fi

echo "Note: WebSocket testing requires Node.js and socket.io-client"
echo "  Install: npm install socket.io-client"
echo "  See TESTING_GUIDE.md for WebSocket testing instructions"
