#!/bin/bash

# Run comprehensive load test first, then dedicated load tests using the same tokens
# This ensures all tests use the same registered users

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Running All Load Tests${NC}"
echo "=============================================="
echo ""
echo "This script will:"
echo "  1. Run comprehensive load test (registers users)"
echo "  2. Run prompts load test (using registered users)"
echo "  3. Run subscription load test (using registered users)"
echo "  4. Run audio load test (using registered users)"
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3000}"

# Step 1: Run comprehensive load test
echo -e "${BLUE}=============================================="
echo -e "Step 1: Comprehensive Load Test${NC}"
echo "=============================================="
echo ""

./load-test-comprehensive.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Comprehensive load test failed${NC}"
    exit 1
fi

# Check if tokens were exported
EXPORT_FILE="/tmp/load-test-tokens.sh"
if [ ! -f "$EXPORT_FILE" ]; then
    echo -e "${YELLOW}⚠️  Token export file not found. Dedicated tests will register new users.${NC}"
    echo ""
else
    echo ""
    echo -e "${GREEN}✅ Loading tokens from comprehensive test...${NC}"
    source "$EXPORT_FILE"
    echo ""
fi

# Step 2: Run prompts load test
echo -e "${BLUE}=============================================="
echo -e "Step 2: Prompts Load Test${NC}"
echo "=============================================="
echo ""

./load-test-prompts.sh

# Step 3: Run subscription load test
echo -e "${BLUE}=============================================="
echo -e "Step 3: Subscription Load Test${NC}"
echo "=============================================="
echo ""

./load-test-subscription.sh

# Step 4: Run audio load test
echo -e "${BLUE}=============================================="
echo -e "Step 4: Audio Load Test${NC}"
echo "=============================================="
echo ""

./load-test-audio.sh

echo ""
echo -e "${BLUE}=============================================="
echo -e "📊 All Load Tests Complete${NC}"
echo "=============================================="
echo ""
echo -e "${GREEN}✅ All load tests completed!${NC}"
echo ""
