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

## Implementation Todos

### Phase 1: Backend API Setup

#### 1. Create Device Code Session API

**Task**: Implement `/api/cli/auth/device` endpoint
**Acceptance Criteria**:

- [x] Generates unique 8-character device code (e.g., WDJB-MJHT)
- [x] Stores device code in database with 15-minute TTL
- [x] Returns device_code, user_code, and verification_url

#### 2. Create Token Exchange API

**Task**: Implement `/api/cli/auth/token` endpoint
**Acceptance Criteria**:

- [x] Validates device code exists and not expired
- [x] Returns `{ pending: true }` if not yet authenticated
- [x] Returns `{ access_token, refresh_token }` after user authentication
- [x] Deletes device code after successful token exchange
- [x] Returns appropriate error for expired/invalid codes

#### 3. Create Token Generation API

**Task**: Implement `/api/cli/auth/generate-token` endpoint
**Acceptance Criteria**:

- [x] Requires authenticated user (Clerk JWT)
- [x] Generates long-lived CLI token (30-90 days)
- [x] Stores token metadata (name, created_at, last_used)
- [x] Returns token and expiration date
- [x] Limits number of active tokens per user (e.g., 10)

### Phase 2: CLI Authentication Minimum Viable Flow

#### 4. Create CLI Authentication Page

**Task**: Implement `/cli-auth` page for device code entry
**Acceptance Criteria**:

- [ ] Clean UI for entering 8-character device code
- [ ] Input validation and formatting (auto-uppercase, dash handling)
- [ ] Shows clear error messages for invalid/expired codes
- [ ] Redirects to success page after authentication
- [ ] Mobile-responsive design

#### 5. Implement Basic CLI Authentication Commands

**Task**: Create minimal CLI with auth commands
**Acceptance Criteria**:

- [ ] `uspark auth login` initiates device flow
- [ ] `uspark auth logout` clears stored credentials
- [ ] `uspark auth status` shows current auth state
- [ ] Store token in simple config file (~/.uspark/config.json)
- [ ] Basic error handling for network issues

#### 6. Implement Authentication Service

**Task**: Create basic auth service for CLI
**Acceptance Criteria**:

- [ ] `requestDeviceCode()` calls device API and returns code
- [ ] `pollForToken()` polls every 5 seconds with timeout
- [ ] `storeToken()` saves to config file
- [ ] `getStoredToken()` reads from config file
- [ ] Basic retry logic for network errors

### Phase 3: Enhanced Features

#### 7. Create Token Management Page

**Task**: Implement `/settings/tokens` page
**Acceptance Criteria**:

- [ ] Lists all active CLI tokens with metadata
- [ ] Shows last used timestamp for each token
- [ ] Allows generating new tokens with custom names
- [ ] Supports revoking individual tokens
- [ ] Shows token only once after generation (with copy button)

#### 8. Add Environment Variable Support

**Task**: Implement `USPARK_TOKEN` environment variable support
**Acceptance Criteria**:

- [ ] Token from env var takes precedence over stored credentials
- [ ] Works with all CLI commands requiring authentication
- [ ] Clear error message if token is invalid/expired
- [ ] Does not interfere with stored credentials
- [ ] Documented in CLI help text

#### 9. Enhance CLI with Additional Commands

**Task**: Add more CLI auth capabilities
**Acceptance Criteria**:

- [ ] `uspark auth whoami` displays user info
- [ ] Proper --help documentation for each command
- [ ] Secure credential storage using keytar
- [ ] Advanced retry logic and error recovery

#### 10. Token Validation and Management APIs

**Task**: Add APIs for token lifecycle management
**Acceptance Criteria**:

- [ ] API to validate CLI token and get user info
- [ ] API to list user's active tokens
- [ ] API to revoke specific tokens
- [ ] API to update last_used timestamp
- [ ] Automatic cleanup of expired tokens

### Phase 4: Production Readiness

#### 11. Setup CLI Project Structure

**Task**: Formalize CLI package structure
**Acceptance Criteria**:

- [ ] TypeScript configuration with strict mode
- [ ] ESLint and Prettier setup matching project standards
- [ ] Test framework (Vitest) configured
- [ ] Build pipeline with tsup configured
- [ ] Package.json with correct bin entry point
- [ ] NPM publishing configuration

#### 12. Comprehensive Testing

**Task**: Create full test coverage
**Acceptance Criteria**:

- [ ] Unit tests for auth service functions
- [ ] Integration tests for all API endpoints
- [ ] E2E test for complete auth flow
- [ ] Tests for token expiration scenarios
- [ ] Tests for concurrent device code requests
- [ ] Performance and load testing

#### 13. Documentation and Developer Experience

**Task**: Create complete documentation
**Acceptance Criteria**:

- [ ] README with installation instructions
- [ ] Authentication setup guide
- [ ] API reference documentation
- [ ] Troubleshooting guide
- [ ] CI/CD integration examples
- [ ] Video tutorial for first-time users

#### 14. Security Hardening

**Task**: Implement security best practices
**Acceptance Criteria**:

- [ ] Rate limiting on all auth endpoints
- [ ] Audit logging for auth events
- [ ] Token rotation capabilities
- [ ] Security headers on web pages
- [ ] Penetration testing
- [ ] Security documentation
