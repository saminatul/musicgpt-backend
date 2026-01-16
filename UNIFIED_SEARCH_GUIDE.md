# 🔍 Unified Search Testing Guide

## Overview

The unified search endpoint allows you to search across **Users** and **Audio** with weighted ranking and cursor-based pagination.

**Endpoint**: `GET /search?q={query}&page={page}&limit={limit}`

---

## Quick Start

### 1. Get Authentication Token

First, you need to authenticate and get a Bearer token:

```bash
# Register or Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }'

# Response includes accessToken
# Save it for subsequent requests
```

### 2. Basic Search

```bash
# Search for "john"
curl -X GET "http://localhost:3000/search?q=john" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Search Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | ✅ Yes | - | Search query |
| `page` | number | ❌ No | 1 | Page number (currently used, but cursor-based pagination is available) |
| `limit` | number | ❌ No | 10 | Results per entity type |

---

## Response Structure

```json
{
  "users": {
    "data": [
      {
        "id": "uuid",
        "email": "john@example.com",
        "displayName": "John Doe",
        "subscriptionStatus": "FREE"
      }
    ],
    "meta": {
      "nextCursor": "user-uuid-123"  // Present if more results available
    }
  },
  "audio": {
    "data": [
      {
        "id": "uuid",
        "promptId": "uuid",
        "userId": "uuid",
        "title": "John's Song",
        "url": "https://..."
      }
    ],
    "meta": {
      "nextCursor": "audio-uuid-456"  // Present if more results available
    }
  }
}
```

---

## Ranking Algorithm

### Scoring System

- **Exact Match**: 3 points
- **Partial Match**: 2 points
- **No Match**: 0 points

### For Users

Searches in:
- `email` field
- `displayName` field

**Scoring Logic**:
- Exact email match: 3 points
- Partial email match: 2 points
- Exact displayName match: 3 points
- Partial displayName match: 2 points
- **Final score**: `Math.max(emailExact, emailPartial, nameExact, namePartial)`

### For Audio

Searches in:
- `title` field

**Scoring Logic**:
- Exact title match: 3 points
- Partial title match: 2 points
- **Final score**: `Math.max(exact, partial)`

### Ranking Order

Results are sorted by score in **descending order**:
1. Highest scores first (exact matches)
2. Lower scores next (partial matches)
3. No matches excluded

---

## Testing Examples

### Example 1: Basic Search

```bash
# Search for "john"
curl -X GET "http://localhost:3000/search?q=john" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq
```

**Expected Results** (sorted by score):
1. Users with exact email match: `john@example.com` (score: 3)
2. Users with exact name match: `John Doe` (score: 3)
3. Users with partial email match: `johnny@example.com` (score: 2)
4. Audio with partial title match: `"John's Song"` (score: 2)

### Example 2: Search with Limit

```bash
# Limit to 5 results per entity type
curl -X GET "http://localhost:3000/search?q=john&limit=5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq
```

### Example 3: Case-Insensitive Search

```bash
# Search is case-insensitive
curl -X GET "http://localhost:3000/search?q=JOHN" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq

# Same results as "john"
```

### Example 4: Partial Match

```bash
# Search for partial string
curl -X GET "http://localhost:3000/search?q=doe" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq

# Will match:
# - "John Doe" (partial name match, score: 2)
# - "doe@example.com" (partial email match, score: 2)
```

### Example 5: Empty Query

```bash
# Empty query returns empty results
curl -X GET "http://localhost:3000/search?q=" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq

# Response:
# {
#   "users": { "data": [], "meta": {} },
#   "audio": { "data": [], "meta": {} }
# }
```

---

## Testing with Swagger UI

1. **Open Swagger**: http://localhost:3000/docs

2. **Authorize**:
   - Click "Authorize" button (top right)
   - Enter your Bearer token
   - Click "Authorize"

3. **Test Search**:
   - Find `GET /search` endpoint
   - Click "Try it out"
   - Enter query: `q=john`
   - Optionally set `limit=5`
   - Click "Execute"

4. **View Results**:
   - Check response body
   - Verify ranking (exact matches first)
   - Check `nextCursor` in meta if more results available

---

## Testing Ranking Logic

### Test Data Setup

Create test data to verify ranking:

```bash
# Create users with different match types
# User 1: Exact email match
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123",
    "displayName": "John Smith"
  }'

# User 2: Partial email match
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "johnny@example.com",
    "password": "Password123",
    "displayName": "Johnny Doe"
  }'

# User 3: Exact name match
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "j.smith@example.com",
    "password": "Password123",
    "displayName": "John"
  }'
```

### Verify Ranking

```bash
# Search for "john"
curl -X GET "http://localhost:3000/search?q=john" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq '.users.data[] | {email, displayName}'
```

**Expected Order** (by score):
1. `john@example.com` (exact email, score: 3)
2. `John` (exact name, score: 3)
3. `johnny@example.com` (partial email, score: 2)
4. `Johnny Doe` (partial name, score: 2)

---

## Pagination

### Current Implementation

The search endpoint uses **page-based pagination** in the controller, but the underlying repositories support **cursor-based pagination**.

### Cursor-Based Pagination (Available in Repositories)

The repositories return `nextCursor` in the response when more results are available.

**Example Response**:
```json
{
  "users": {
    "data": [...],
    "meta": {
      "nextCursor": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

**Note**: Currently, the controller doesn't accept a `cursor` parameter, but the infrastructure supports it. To use cursor-based pagination, you would need to modify the controller to accept a `cursor` query parameter.

---

## Testing Pagination

### Test with Limit

```bash
# Get first page with limit 5
curl -X GET "http://localhost:3000/search?q=john&limit=5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq

# Check if nextCursor is present in meta
# If present, there are more results
```

### Verify Cursor in Response

```bash
# Search and extract cursor
CURSOR=$(curl -s -X GET "http://localhost:3000/search?q=john&limit=5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq -r '.users.meta.nextCursor')

echo "Next cursor: $CURSOR"
```

---

## Error Scenarios

### Missing Query Parameter

```bash
# Missing 'q' parameter
curl -X GET "http://localhost:3000/search" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Returns empty results (not an error)
```

### Missing Authorization

```bash
# No Bearer token
curl -X GET "http://localhost:3000/search?q=john"

# Response: 401 Unauthorized
# {
#   "statusCode": 401,
#   "message": "Authorization Bearer token is required"
# }
```

### Invalid Token

```bash
# Invalid Bearer token
curl -X GET "http://localhost:3000/search?q=john" \
  -H "Authorization: Bearer invalid-token"

# Response: 401 Unauthorized
# {
#   "statusCode": 401,
#   "message": "Invalid token"
# }
```

---

## Performance Testing

### Test Parallel Search

The search service searches users and audio **in parallel** using `Promise.all()`.

```bash
# Time the search
time curl -X GET "http://localhost:3000/search?q=john" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test with Large Dataset

```bash
# Search with large limit
curl -X GET "http://localhost:3000/search?q=john&limit=100" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq '.users.data | length'
```

---

## Search Scope

### Users

Searches in:
- ✅ `email` field (case-insensitive)
- ✅ `displayName` field (case-insensitive)

**Example**:
- Query: `"john"` matches:
  - `john@example.com` (email)
  - `John Doe` (displayName)
  - `johnny@example.com` (partial email)

### Audio

Searches in:
- ✅ `title` field (case-insensitive)

**Example**:
- Query: `"song"` matches:
  - `"My Song"` (title)
  - `"Song Title"` (title)
  - `"songs collection"` (partial title)

---

## Ranking Examples

### Example 1: Exact vs Partial Match

**Query**: `"john"`

**Results** (sorted by score):
1. User: `john@example.com` (exact email, **score: 3**)
2. User: `John` (exact name, **score: 3**)
3. User: `johnny@example.com` (partial email, **score: 2**)
4. Audio: `"John's Song"` (partial title, **score: 2**)

### Example 2: Multiple Matches

**Query**: `"doe"`

**Results**:
1. User: `doe@example.com` (exact email, **score: 3**)
2. User: `Doe` (exact name, **score: 3**)
3. User: `John Doe` (partial name, **score: 2**)
4. User: `adoe@example.com` (partial email, **score: 2**)

### Example 3: No Exact Match

**Query**: `"xyz"`

**Results** (only partial matches):
1. User: `xyz123@example.com` (partial email, **score: 2**)
2. Audio: `"XYZ Song"` (partial title, **score: 2**)

---

## Complete Testing Script

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:3000"
TOKEN="YOUR_ACCESS_TOKEN"

echo "🔍 Testing Unified Search"
echo "========================"
echo ""

# Test 1: Basic search
echo "Test 1: Basic search for 'john'"
curl -s -X GET "$API_URL/search?q=john" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.users.data | length, .audio.data | length'
echo ""

# Test 2: Search with limit
echo "Test 2: Search with limit=5"
curl -s -X GET "$API_URL/search?q=john&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.users.meta, .audio.meta'
echo ""

# Test 3: Verify ranking
echo "Test 3: Verify ranking (exact matches first)"
curl -s -X GET "$API_URL/search?q=john" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.users.data[] | {email, displayName}'
echo ""

# Test 4: Empty query
echo "Test 4: Empty query"
curl -s -X GET "$API_URL/search?q=" \
  -H "Authorization: Bearer $TOKEN" \
  | jq
echo ""

# Test 5: Case-insensitive
echo "Test 5: Case-insensitive search"
curl -s -X GET "$API_URL/search?q=JOHN" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.users.data | length'
echo ""

echo "✅ Testing complete"
```

---

## Troubleshooting

### Issue: No results returned

**Check**:
1. Verify you have data in the database
2. Check if query matches any records
3. Verify Bearer token is valid

### Issue: Results not ranked correctly

**Check**:
1. Verify exact matches appear before partial matches
2. Check scores: exact = 3, partial = 2
3. Verify case-insensitive matching works

### Issue: Pagination not working

**Check**:
1. Verify `nextCursor` is present in response when more results exist
2. Check if `limit` parameter is working
3. Verify cursor-based pagination in repository implementation

---

## Summary

✅ **Endpoint**: `GET /search?q={query}&page={page}&limit={limit}`  
✅ **Authentication**: Bearer token required  
✅ **Search Scope**: Users (email, displayName) + Audio (title)  
✅ **Ranking**: Exact match (3) > Partial match (2)  
✅ **Pagination**: Cursor-based (infrastructure), page-based (controller)  
✅ **Case-insensitive**: All searches are case-insensitive  

For more details, see the [README.md](./README.md) section on Unified Search Ranking.
