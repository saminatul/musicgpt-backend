# Authorization Guide - Bearer Token Authentication

## Overview

All API endpoints (except `/auth/register` and `/auth/login`) require Bearer token authentication. The user ID is automatically extracted from the JWT token, so you **never need to include `user_id` in request payloads**.

---

## 🔐 Authentication Flow

### 1. Register or Login

```bash
# Register
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe"
}

# Response includes accessToken
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "uuid-token",
  "user": { ... }
}
```

### 2. Use Bearer Token

Include the token in the `Authorization` header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📋 Endpoint Authorization

### Public Endpoints (No Token Required)

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Protected Endpoints (Bearer Token Required)

All other endpoints require a valid Bearer token in the `Authorization` header.

---

## 🎯 User-Specific Endpoints

These endpoints automatically use the authenticated user's ID from the JWT token:

### Prompts

- **`POST /prompts`** - Creates prompt for authenticated user
  - ✅ No `user_id` in request body
  - ✅ User ID extracted from JWT token
  
- **`GET /prompts`** - Returns prompts for authenticated user
  - ✅ No `user_id` in query params
  - ✅ User ID extracted from JWT token
  
- **`GET /prompts/:id`** - Returns prompt only if it belongs to authenticated user
  - ✅ Returns 403 if prompt belongs to another user

### Audio

- **`GET /audio`** - Returns audio files for authenticated user
  - ✅ No `user_id` in query params
  - ✅ User ID extracted from JWT token
  
- **`GET /audio/:id`** - Returns audio only if it belongs to authenticated user
  - ✅ Returns 403 if audio belongs to another user
  
- **`PUT /audio/:id`** - Updates audio only if it belongs to authenticated user
  - ✅ Returns 403 if audio belongs to another user

### Subscription

- **`POST /subscription/subscribe`** - Upgrades authenticated user to PAID
  - ✅ No `user_id` in request body
  - ✅ User ID extracted from JWT token
  
- **`POST /subscription/cancel`** - Downgrades authenticated user to FREE
  - ✅ No `user_id` in request body
  - ✅ User ID extracted from JWT token

---

## 📝 Request Examples

### Create Prompt (No user_id needed)

```bash
curl -X POST http://localhost:3000/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Generate a relaxing jazz melody"
  }'
```

### Get Your Prompts (No user_id needed)

```bash
curl -X GET "http://localhost:3000/prompts?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Your Audio Files (No user_id needed)

```bash
curl -X GET "http://localhost:3000/audio?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Subscribe (No user_id needed)

```bash
curl -X POST http://localhost:3000/subscription/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚫 What NOT to Include

**Never include `user_id` in request payloads for these endpoints:**

- ❌ `POST /prompts` - Don't include `user_id`
- ❌ `GET /prompts` - Don't include `user_id` in query
- ❌ `GET /audio` - Don't include `user_id` in query
- ❌ `POST /subscription/subscribe` - Don't include `user_id`
- ❌ `POST /subscription/cancel` - Don't include `user_id`

The system automatically extracts the user ID from the JWT token.

---

## 🔒 Security Features

1. **Automatic User Identification**: User ID is extracted from JWT token
2. **Resource Ownership**: Users can only access their own prompts and audio
3. **Token Validation**: All protected endpoints validate the JWT token
4. **403 Forbidden**: Returns 403 if user tries to access another user's resources

---

## 📊 Response Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **401 Unauthorized**: Invalid or missing Bearer token
- **403 Forbidden**: Valid token but trying to access another user's resource
- **404 Not Found**: Resource not found (or doesn't belong to you)

---

## 🧪 Testing with Swagger

1. Go to http://localhost:3000/docs
2. Click "Authorize" button (top right)
3. Enter your Bearer token: `Bearer YOUR_TOKEN`
4. All protected endpoints will now work
5. Token persists across requests

---

## 💡 Best Practices

1. **Always include Bearer token** for protected endpoints
2. **Never include user_id** in request payloads
3. **Handle 401 errors** by refreshing the token
4. **Handle 403 errors** by checking resource ownership
5. **Store token securely** in your application

---

## 🔄 Token Refresh

If your token expires (401 error):

```bash
# Refresh the token
POST /auth/refresh
{
  "refreshToken": "your-refresh-token"
}

# Use new accessToken for subsequent requests
```

---

This ensures secure, user-specific access to all resources without requiring `user_id` in request payloads.
