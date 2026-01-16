#!/bin/bash

# Unified Search Testing Script
# Usage: ./test-search.sh [TOKEN]

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
TOKEN="${1:-}"

echo -e "${BLUE}🔍 Unified Search Testing${NC}"
echo "================================"
echo ""

# Check if token is provided
if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  No token provided. Getting token from login...${NC}"
    
    # Try to login (you may need to adjust credentials)
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@example.com",
            "password": "Password123"
        }')
    
    TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // empty')
    
    if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
        echo -e "${RED}❌ Failed to get token. Please provide token as argument:${NC}"
        echo "   ./test-search.sh YOUR_ACCESS_TOKEN"
        echo ""
        echo "Or register/login first:"
        echo "   curl -X POST $API_URL/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"...\",\"password\":\"...\"}'"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Token obtained${NC}"
    echo ""
fi

# Test 1: Basic search
echo -e "${BLUE}Test 1: Basic search for 'john'${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/search?q=john" \
    -H "Authorization: Bearer $TOKEN")

USER_COUNT=$(echo $RESPONSE | jq -r '.users.data | length')
AUDIO_COUNT=$(echo $RESPONSE | jq -r '.audio.data | length')

echo "   Users found: $USER_COUNT"
echo "   Audio found: $AUDIO_COUNT"

if [ "$USER_COUNT" -gt 0 ] || [ "$AUDIO_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Search working${NC}"
else
    echo -e "   ${YELLOW}⚠️  No results (may be expected if no data)${NC}"
fi
echo ""

# Test 2: Verify ranking (exact matches first)
echo -e "${BLUE}Test 2: Verify ranking (exact matches should appear first)${NC}"
RANKING_RESPONSE=$(curl -s -X GET "$API_URL/search?q=john" \
    -H "Authorization: Bearer $TOKEN")

echo "   Top 3 user results:"
echo $RANKING_RESPONSE | jq -r '.users.data[0:3][] | "   - \(.email) | \(.displayName)"' 2>/dev/null || echo "   (No users found)"
echo ""

# Test 3: Search with limit
echo -e "${BLUE}Test 3: Search with limit=5${NC}"
LIMIT_RESPONSE=$(curl -s -X GET "$API_URL/search?q=john&limit=5" \
    -H "Authorization: Bearer $TOKEN")

LIMIT_USER_COUNT=$(echo $LIMIT_RESPONSE | jq -r '.users.data | length')
LIMIT_AUDIO_COUNT=$(echo $LIMIT_RESPONSE | jq -r '.audio.data | length')

echo "   Users returned: $LIMIT_USER_COUNT (limit: 5)"
echo "   Audio returned: $LIMIT_AUDIO_COUNT (limit: 5)"

# Check for nextCursor
USER_CURSOR=$(echo $LIMIT_RESPONSE | jq -r '.users.meta.nextCursor // empty')
AUDIO_CURSOR=$(echo $LIMIT_RESPONSE | jq -r '.audio.meta.nextCursor // empty')

if [ ! -z "$USER_CURSOR" ] && [ "$USER_CURSOR" != "null" ]; then
    echo -e "   ${GREEN}✅ User pagination cursor available: $USER_CURSOR${NC}"
fi
if [ ! -z "$AUDIO_CURSOR" ] && [ "$AUDIO_CURSOR" != "null" ]; then
    echo -e "   ${GREEN}✅ Audio pagination cursor available: $AUDIO_CURSOR${NC}"
fi
echo ""

# Test 4: Case-insensitive search
echo -e "${BLUE}Test 4: Case-insensitive search (JOHN vs john)${NC}"
UPPER_RESPONSE=$(curl -s -X GET "$API_URL/search?q=JOHN" \
    -H "Authorization: Bearer $TOKEN")
LOWER_RESPONSE=$(curl -s -X GET "$API_URL/search?q=john" \
    -H "Authorization: Bearer $TOKEN")

UPPER_COUNT=$(echo $UPPER_RESPONSE | jq -r '.users.data | length')
LOWER_COUNT=$(echo $LOWER_RESPONSE | jq -r '.users.data | length')

if [ "$UPPER_COUNT" == "$LOWER_COUNT" ]; then
    echo -e "   ${GREEN}✅ Case-insensitive working (both returned $UPPER_COUNT results)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Case sensitivity may be an issue${NC}"
fi
echo ""

# Test 5: Empty query
echo -e "${BLUE}Test 5: Empty query (should return empty results)${NC}"
EMPTY_RESPONSE=$(curl -s -X GET "$API_URL/search?q=" \
    -H "Authorization: Bearer $TOKEN")

EMPTY_USER_COUNT=$(echo $EMPTY_RESPONSE | jq -r '.users.data | length')
EMPTY_AUDIO_COUNT=$(echo $EMPTY_RESPONSE | jq -r '.audio.data | length')

if [ "$EMPTY_USER_COUNT" -eq 0 ] && [ "$EMPTY_AUDIO_COUNT" -eq 0 ]; then
    echo -e "   ${GREEN}✅ Empty query handled correctly${NC}"
else
    echo -e "   ${YELLOW}⚠️  Empty query returned results${NC}"
fi
echo ""

# Test 6: Missing authorization
echo -e "${BLUE}Test 6: Missing authorization (should return 401)${NC}"
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/search?q=john")
HTTP_CODE=$(echo "$AUTH_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" == "401" ]; then
    echo -e "   ${GREEN}✅ Authorization required (401)${NC}"
else
    echo -e "   ${RED}❌ Expected 401, got $HTTP_CODE${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}================================"
echo -e "📊 Test Summary${NC}"
echo "================================"
echo ""
echo "To test manually:"
echo "  curl -X GET \"$API_URL/search?q=john\" \\"
echo "    -H \"Authorization: Bearer $TOKEN\" | jq"
echo ""
echo "To test in Swagger UI:"
echo "  1. Open: $API_URL/docs"
echo "  2. Click 'Authorize' and enter your token"
echo "  3. Find 'GET /search' endpoint"
echo "  4. Click 'Try it out' and test"
echo ""
echo -e "${GREEN}✅ Testing complete${NC}"
