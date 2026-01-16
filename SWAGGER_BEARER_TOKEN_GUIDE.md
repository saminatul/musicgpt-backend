# Swagger Bearer Token Authentication Guide

## ✅ Changes Made

### 1. Removed `userId` from Response Payloads

**Updated DTOs**:
- ✅ `PromptResponseDto` - Removed `userId` field
- ✅ `AudioResponseDto` - Removed `userId` field  
- ✅ `SubscriptionResponseDto` - Removed `userId` field

**Why**: User ID is already known from the JWT token, so it doesn't need to be included in responses for security and simplicity.

### 2. Bearer Token in Swagger UI

All protected endpoints now clearly show:
- 🔒 Lock icon indicating authentication required
- Bearer token input field in Swagger UI
- Clear descriptions mentioning "Requires Bearer token authentication"

---

## 🔐 How to Use Bearer Token in Swagger

### Step 1: Get Your Token

1. **Register or Login**:
   - Go to `/auth/register` or `/auth/login` endpoint
   - Submit the request
   - Copy the `accessToken` from the response

### Step 2: Authorize in Swagger

1. **Open Swagger UI**: http://localhost:3000/docs
2. **Click "Authorize" button** (top right, lock icon 🔒)
3. **Enter your token**:
   - Option 1: Just paste the token (Swagger adds "Bearer " automatically)
   - Option 2: Enter `Bearer YOUR_TOKEN_HERE`
4. **Click "Authorize"**
5. **Click "Close"**

### Step 3: Test Protected Endpoints

Now all protected endpoints will:
- ✅ Show a lock icon 🔒
- ✅ Automatically include the Bearer token in requests
- ✅ Work without manual header entry

---

## 📋 Protected Endpoints

All these endpoints require Bearer token and show it in Swagger:

### Prompts
- `POST /prompts` - Create prompt
- `GET /prompts` - Get your prompts
- `GET /prompts/:id` - Get prompt by ID

### Audio
- `GET /audio` - Get your audio files
- `GET /audio/:id` - Get audio by ID
- `PUT /audio/:id` - Update audio

### Subscription
- `POST /subscription/subscribe` - Subscribe to paid tier
- `POST /subscription/cancel` - Cancel subscription

---

## 📝 Response Examples (No userId)

### Prompt Response
```json
{
  "id": "prompt-uuid",
  "text": "Generate a relaxing jazz melody",
  "status": "PENDING",
  "createdAt": "2024-01-15T...",
  "updatedAt": "2024-01-15T..."
}
```

### Audio Response
```json
{
  "id": "audio-uuid",
  "promptId": "prompt-uuid",
  "title": "Audio for: Generate a relaxing jazz melody",
  "url": "https://example.com/audio/...",
  "createdAt": "2024-01-15T...",
  "updatedAt": "2024-01-15T..."
}
```

### Subscription Response
```json
{
  "subscriptionStatus": "PAID",
  "message": "Subscription activated successfully"
}
```

---

## 🧪 Testing in Swagger

### Example: Create a Prompt

1. **Authorize** (click lock icon, enter token)
2. **Go to** `POST /prompts`
3. **Click "Try it out"**
4. **Enter request body**:
   ```json
   {
     "text": "Generate a relaxing jazz melody"
   }
   ```
5. **Click "Execute"**
6. **Check response** - Should NOT include `userId`

### Example: Get Your Prompts

1. **Ensure you're authorized** (lock icon should be filled)
2. **Go to** `GET /prompts`
3. **Click "Try it out"**
4. **Click "Execute"**
5. **Check response** - Prompts should NOT include `userId` field

---

## ✅ Verification Checklist

- [ ] Swagger shows lock icon 🔒 on all protected endpoints
- [ ] "Authorize" button works and accepts Bearer token
- [ ] Token persists across requests (enabled by `persistAuthorization: true`)
- [ ] Prompt responses don't include `userId`
- [ ] Audio responses don't include `userId`
- [ ] Subscription responses don't include `userId`
- [ ] All endpoints work with Bearer token

---

## 🔍 Troubleshooting

### Token Not Persisting

**Issue**: Need to re-enter token for each request

**Solution**: 
- Check that `persistAuthorization: true` is set in `main.ts`
- Clear browser cache and try again
- Make sure you clicked "Authorize" and then "Close"

### 401 Unauthorized in Swagger

**Issue**: Getting 401 even after authorizing

**Solution**:
- Make sure token is valid (not expired)
- Check token format: Should be just the token, not "Bearer token"
- Try logging in again to get a fresh token
- Check browser console for errors

### Lock Icon Not Showing

**Issue**: Endpoints don't show lock icon

**Solution**:
- Verify `@ApiBearerAuth('JWT-auth')` is on controller
- Check that security scheme name matches ('JWT-auth')
- Restart the server

---

## 📚 Additional Notes

- **Token Format**: Swagger automatically adds "Bearer " prefix, so just paste the token
- **Token Expiration**: Access tokens expire in 15 minutes (configurable)
- **Refresh Token**: Use `/auth/refresh` to get a new access token
- **Security**: Never share your Bearer token or commit it to version control

---

All changes are complete! Swagger UI now clearly shows Bearer token requirements and responses no longer include `userId`.
