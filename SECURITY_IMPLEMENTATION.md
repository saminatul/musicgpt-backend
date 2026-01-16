# Security Implementation - Bearer Token Authentication

## Overview

All protected endpoints (Audio, Prompts, Subscription, Users, Search) implement strict Bearer token authentication with clear error messages and proper HTTP status codes.

---

## 🔐 Authentication Flow

### 1. Missing Token

**Scenario**: Request sent without `Authorization` header

**Response**:
```json
{
  "statusCode": 401,
  "message": "Authorization Bearer token is required"
}
```

**HTTP Status**: `401 Unauthorized`

**Example**:
```bash
curl -X GET http://localhost:3000/prompts
# Returns 401 with message: "Authorization Bearer token is required"
```

### 2. Invalid/Expired Token

**Scenario**: Request sent with invalid, expired, or malformed token

**Response**:
```json
{
  "statusCode": 401,
  "message": "Invalid token"
}
```

**HTTP Status**: `401 Unauthorized`

**Example**:
```bash
curl -X GET http://localhost:3000/prompts \
  -H "Authorization: Bearer invalid-token-here"
# Returns 401 with message: "Invalid token"
```

### 3. Valid Token

**Scenario**: Request sent with valid Bearer token

**Response**: Normal API response (200, 201, etc.)

**Example**:
```bash
curl -X GET http://localhost:3000/prompts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# Returns 200 with data
```

---

## 🛡️ Implementation Details

### JWT Auth Guard (`jwt-auth.guard.ts`)

The guard implements two-level validation:

1. **Header Check** (in `canActivate`):
   - Checks if `Authorization` header exists
   - Checks if header starts with `Bearer `
   - Throws: `"Authorization Bearer token is required"` (401)

2. **Token Validation** (in `handleRequest`):
   - Validates token signature
   - Checks token expiration
   - Validates user exists
   - Throws: `"Invalid token"` (401)

### Error Messages

| Scenario | HTTP Status | Message |
|----------|-------------|---------|
| Missing Authorization header | 401 | "Authorization Bearer token is required" |
| Invalid Bearer format | 401 | "Authorization Bearer token is required" |
| Invalid/expired token | 401 | "Invalid token" |
| User not found | 401 | "Invalid token" |

---

## 📋 Protected Endpoints

All these endpoints require Bearer token authentication:

### Audio Endpoints
- `GET /audio` - Get your audio files
- `GET /audio/:id` - Get audio by ID
- `PUT /audio/:id` - Update audio

### Prompt Endpoints
- `POST /prompts` - Create prompt
- `GET /prompts` - Get your prompts
- `GET /prompts/:id` - Get prompt by ID

### Subscription Endpoints
- `POST /subscription/subscribe` - Subscribe to paid tier
- `POST /subscription/cancel` - Cancel subscription

### User Endpoints
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user

### Search Endpoints
- `GET /search` - Unified search

---

## 📚 Swagger Documentation

### Bearer Token Configuration

Swagger is configured with:
- **Security Scheme**: `JWT-auth`
- **Type**: `http`
- **Scheme**: `bearer`
- **Bearer Format**: `JWT`
- **Description**: "Enter JWT token obtained from /auth/login or /auth/register. Format: Bearer {token}"

### Using Swagger UI

1. Navigate to http://localhost:3000/docs
2. Click the **"Authorize"** button (top right)
3. Enter your token in the format: `Bearer YOUR_TOKEN_HERE`
   - Or just: `YOUR_TOKEN_HERE` (Swagger adds "Bearer " automatically)
4. Click **"Authorize"**
5. All protected endpoints will now show a lock icon 🔒
6. Token persists across requests (enabled by `persistAuthorization: true`)

### Swagger Response Examples

All protected endpoints include 401 response documentation:

```yaml
responses:
  401:
    description: 'Unauthorized - Missing or invalid Bearer token'
    schema:
      type: object
      properties:
        statusCode:
          type: number
          example: 401
        message:
          type: string
          example: "Authorization Bearer token is required"
```

---

## 🧪 Testing Authentication

### Test Missing Token

```bash
# Should return 401
curl -X GET http://localhost:3000/prompts

# Response:
# {
#   "statusCode": 401,
#   "message": "Authorization Bearer token is required"
# }
```

### Test Invalid Token

```bash
# Should return 401
curl -X GET http://localhost:3000/prompts \
  -H "Authorization: Bearer invalid-token"

# Response:
# {
#   "statusCode": 401,
#   "message": "Invalid token"
# }
```

### Test Valid Token

```bash
# 1. First, get a token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.accessToken')

# 2. Use the token
curl -X GET http://localhost:3000/prompts \
  -H "Authorization: Bearer $TOKEN"

# Response: 200 with data
```

---

## ✅ Security Best Practices Implemented

1. ✅ **Clear Error Messages**: Distinguishes between missing and invalid tokens
2. ✅ **Proper HTTP Status Codes**: Uses 401 for all authentication failures
3. ✅ **Consistent Implementation**: All protected endpoints use the same guard
4. ✅ **Swagger Documentation**: All endpoints clearly show Bearer token requirement
5. ✅ **Token Validation**: Validates signature, expiration, and user existence
6. ✅ **No Information Leakage**: Generic "Invalid token" message for security

---

## 🔍 Code Locations

- **Guard**: `src/presentation/guards/jwt-auth.guard.ts`
- **Strategy**: `src/presentation/strategies/jwt.strategy.ts`
- **Controllers**: All in `src/presentation/controllers/`
- **Swagger Config**: `src/main.ts`

---

## 📝 Notes

- All error responses use HTTP status code `401 Unauthorized`
- Error messages are user-friendly but don't leak sensitive information
- Swagger UI automatically adds "Bearer " prefix when you enter a token
- Token persistence in Swagger is enabled for better developer experience
