# CLI Authentication Specification

## Overview

Since Clerk does not natively support OAuth Device Authorization Grant Flow, we implement a hybrid approach combining device code authentication pattern with Clerk's JWT-based authentication system.

## Architecture

```
CLI                            Web App                      Clerk
 |                               |                            |
 |-- 1. Generate device code --> |                            |
 |<-- Return code & URL -------- |                            |
 |                               |                            |
 |-- 2. Open browser ----------> |-- 3. User login ---------> |
 |     (with device code)        |<-- Return JWT ------------ |
 |                               |                            |
 |-- 4. Poll for status -------> |                            |
 |<-- 5. Return token ---------- |                            |
```

## Authentication Methods

The CLI supports two authentication methods:

### Method 1: Interactive Login
```bash
uspark auth login
```
- Generate unique device code (e.g., `WDJB-MJHT`)
- Call backend API to create authentication session
- Store token in system keychain for future use

### Method 2: Environment Variable
```bash
USPARK_TOKEN=xxx uspark sync
```
- Pass token directly via environment variable
- Useful for CI/CD pipelines and automation
- Token can be generated from web UI settings page

## Implementation Steps

### 1. Token Resolution Priority
The CLI checks for authentication in the following order:
1. `USPARK_TOKEN` environment variable (if present)
2. Stored credentials from `uspark auth login`
3. Prompt user to authenticate if neither exists

### 2. Backend API Endpoints
```typescript
POST /api/cli/auth/device
Returns: { device_code, user_code, verification_url }

POST /api/cli/auth/token
Body: { device_code }
Returns: { access_token, refresh_token } or { pending: true }

POST /api/cli/auth/generate-token
Description: Generate long-lived CLI token from web UI
Returns: { token, expires_at }
```

### 3. Web Authentication Page
- Create `/cli-auth` page
- User enters device code
- Authenticate with Clerk
- Associate JWT token with device code upon success

### 4. CLI Polls for Token
- Poll `/api/cli/auth/token` every 5 seconds
- Store token locally once received

## Code Structure

### CLI Side
```
src/
├── commands/
│   ├── auth.ts         # login, logout, status commands
├── services/
│   ├── auth.service.ts # Authentication logic
│   │   - getAuthToken()     # Check env var first, then stored credentials
│   │   - requestDeviceCode()
│   │   - pollForToken()
│   │   - storeCredentials()
│   │   - getStoredToken()
```

### Web Side
```
app/
├── api/cli/auth/
│   ├── device/route.ts        # Generate and store device code session
│   ├── token/route.ts         # Verify device code and return token
│   ├── generate-token/route.ts # Generate long-lived CLI tokens
├── cli-auth/page.tsx          # Device code input UI with Clerk integration
├── settings/tokens/page.tsx   # Manage CLI access tokens
```

## Security Considerations

1. **Device Code Expiration**: 15 minutes
2. **Token Storage**: Use `keytar` library to store in system keychain
3. **Refresh Mechanism**: Auto-refresh JWT before expiration
4. **Revocation**: Support revoking CLI access from web interface

## Advantages

- ✅ No need for Clerk to support Device Flow
- ✅ User-friendly experience (similar to GitHub CLI)
- ✅ High security (no password exposure)
- ✅ Multi-account support