# CLI Authentication Specification (MVP)

## Overview

For MVP, CLI authentication uses environment variable `USPARK_TOKEN` to authenticate with the backend API.


## Authentication Method

```bash
USPARK_TOKEN=xxx uspark pull --project-id <id>
```

- Pass token via environment variable
- Token generated from web UI settings page

## Implementation

### Backend API Endpoint

```typescript
POST /api/cli/auth/generate-token
Description: Generate long-lived CLI token from web UI
Returns: { token, expires_at }
```

## Code Structure

### CLI Side

```
src/
├── services/
│   ├── auth.service.ts
│   │   - getAuthToken()     # Read from USPARK_TOKEN env var
```

### Web Side

```
app/
├── api/cli/auth/
│   ├── generate-token/route.ts # Generate long-lived CLI tokens
├── settings/tokens/page.tsx     # Generate and view CLI tokens
```


## Implementation Todos

### MVP Requirements

#### 1. Token Generation API ✅

**Task**: Generate long-lived CLI tokens from web UI
**Status**: Completed (PR #45)
**Acceptance Criteria**:

- [x] Requires authenticated user (Clerk JWT)
- [x] Generates long-lived CLI token
- [x] Returns token and expiration date

#### 2. Token Management Page ✅ COMPLETED

**Task**: Basic page to generate CLI tokens
**Status**: Completed - Tokens can be generated from settings page
**Acceptance Criteria**:

- [x] Generate new tokens ✅
- [x] Display token once after generation ✅
- [x] Copy token button ✅

#### 3. CLI Environment Variable Support ✅

**Task**: Read authentication from USPARK_TOKEN  
**Status**: Completed - MVP uses environment variable authentication
**Acceptance Criteria**:

- [x] Read token from USPARK_TOKEN environment variable
- [x] Use token for API authentication
