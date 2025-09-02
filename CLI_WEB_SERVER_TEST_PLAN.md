# CLI Test Plan with Web Server

## Overview

This test plan covers testing the CLI's interaction with the web server, including current functionality and planned authentication features.

## Current State Analysis

### Implemented CLI Commands
- `uspark hello` - Basic welcome message (no server interaction)
- `uspark info` - System information display (no server interaction)

### Implemented Web Server Endpoints
- `POST /api/cli/auth/device` - Generate device codes
- `POST /api/cli/auth/token` - Exchange device codes for tokens
- `POST /api/cli/auth/generate-token` - Generate long-lived tokens

### Planned CLI Commands (Not Yet Implemented)
- `uspark auth login` - Interactive authentication
- `uspark auth logout` - Clear credentials
- `uspark auth status` - Show auth state
- `uspark auth whoami` - Display user info

## Test Categories

### 1. Current CLI Commands (No Server Interaction)

#### Test Cases - Basic CLI Functionality
```bash
# TC001: CLI Hello Command
✓ Test: uspark hello
  Expected: Welcome message displayed
  Validation: Contains "Welcome to the uSpark CLI!"

# TC002: CLI Info Command  
✓ Test: uspark info
  Expected: System information displayed
  Validation: Shows Node version, platform, architecture

# TC003: CLI Help
✓ Test: uspark --help
  Expected: Usage information displayed
  Validation: Contains "Usage: uspark"

# TC004: Invalid Command
✓ Test: uspark invalid-command
  Expected: Error message with suggestions
  Validation: Exit code != 0
```

### 2. Web Server API Endpoints (Standalone Testing)

#### Test Cases - Authentication API
```bash
# TC101: Device Code Generation
✓ Test: POST /api/cli/auth/device
  Expected: Device code response
  Validation: 
    - Status: 200
    - Contains: device_code, user_code, verification_url, expires_in, interval
    - device_code format: XXXX-XXXX

# TC102: Token Exchange - Pending
✓ Test: POST /api/cli/auth/token (with pending device code)
  Expected: Pending response
  Validation:
    - Status: 202
    - Contains: authorization_pending error

# TC103: Token Exchange - Invalid Code
✓ Test: POST /api/cli/auth/token (with invalid code)
  Expected: Error response
  Validation:
    - Status: 400
    - Contains: invalid_request error

# TC104: Token Exchange - Expired Code
✓ Test: POST /api/cli/auth/token (with expired code)
  Expected: Error response
  Validation:
    - Status: 400
    - Contains: expired_token error

# TC105: Generate Long-lived Token - Authenticated
✓ Test: POST /api/cli/auth/generate-token (with valid JWT)
  Expected: Token generated
  Validation:
    - Status: 201
    - Contains: token, name, expires_at, created_at
    - Token prefix: "usp_live_"

# TC106: Generate Long-lived Token - Unauthenticated
✓ Test: POST /api/cli/auth/generate-token (without JWT)
  Expected: Authentication error
  Validation:
    - Status: 401
    - Contains: unauthorized error
```

### 3. Planned CLI-Web Server Integration Tests

#### Test Cases - Authentication Flow (End-to-End)
```bash
# TC201: Complete Authentication Flow
✓ Test: uspark auth login
  Steps:
    1. CLI calls /api/cli/auth/device
    2. CLI displays device code and URL
    3. CLI starts polling /api/cli/auth/token
    4. Simulate user authentication in browser
    5. CLI receives access token
    6. CLI stores token locally
  Expected: Successful authentication
  Validation:
    - Token stored in config
    - Success message displayed
    - Subsequent auth commands work

# TC202: Authentication Status Check
✓ Test: uspark auth status (when authenticated)
  Expected: Shows authenticated state
  Validation:
    - Displays user information
    - Shows token expiry
    - Exit code: 0

# TC203: Authentication Status Check (Unauthenticated)
✓ Test: uspark auth status (when not authenticated)
  Expected: Shows unauthenticated state
  Validation:
    - Clear message about auth state
    - Exit code: 1

# TC204: User Information Display
✓ Test: uspark auth whoami
  Expected: User details displayed
  Validation:
    - User ID, email, name
    - Token information
    - Account status

# TC205: Logout Functionality
✓ Test: uspark auth logout
  Expected: Credentials cleared
  Validation:
    - Local token removed
    - Subsequent auth commands fail appropriately
    - Success message displayed

# TC206: Environment Variable Authentication
✓ Test: USPARK_TOKEN=<valid-token> uspark auth status
  Expected: Uses env token over stored token
  Validation:
    - Recognizes env token
    - Shows authenticated state
    - Doesn't interfere with stored tokens

# TC207: Invalid Environment Token
✓ Test: USPARK_TOKEN=invalid uspark auth status  
  Expected: Authentication failure
  Validation:
    - Clear error message
    - Exit code: 1
    - Suggests re-authentication
```

### 4. Error Handling and Edge Cases

#### Test Cases - Resilience Testing
```bash
# TC301: Network Connectivity Issues
✓ Test: CLI commands when web server is unreachable
  Expected: Graceful error handling
  Validation:
    - Clear error messages
    - Appropriate exit codes
    - Retry suggestions where applicable

# TC302: Malformed Server Responses
✓ Test: CLI handling of invalid JSON responses
  Expected: Robust error parsing
  Validation:
    - No crashes
    - User-friendly error messages
    - Appropriate fallbacks

# TC303: Rate Limiting
✓ Test: Rapid polling of token endpoint
  Expected: Rate limit handling
  Validation:
    - Respects server rate limits
    - Implements exponential backoff
    - Clear messaging about delays

# TC304: Token Expiry During Operation
✓ Test: Using expired tokens for authenticated operations
  Expected: Re-authentication prompt
  Validation:
    - Detects expired tokens
    - Prompts for re-authentication
    - Preserves user context

# TC305: Concurrent CLI Instances
✓ Test: Multiple CLI auth processes simultaneously
  Expected: Proper synchronization
  Validation:
    - No file conflicts
    - Consistent state management
    - Clear error messaging for conflicts
```

### 5. Security Testing

#### Test Cases - Security Validation
```bash
# TC401: Token Storage Security
✓ Test: Check token file permissions
  Expected: Restricted file permissions
  Validation:
    - Token file readable only by owner
    - No plaintext tokens in logs
    - Secure config file handling

# TC402: Device Code Security
✓ Test: Device code uniqueness and entropy
  Expected: Cryptographically secure codes
  Validation:
    - Unique codes generated
    - Sufficient entropy
    - No predictable patterns

# TC403: Token Transmission Security
✓ Test: HTTPS enforcement for API calls
  Expected: All API calls use HTTPS
  Validation:
    - No HTTP fallbacks
    - Certificate validation
    - TLS version requirements

# TC404: Input Validation
✓ Test: Malicious input handling
  Expected: Proper input sanitization
  Validation:
    - No injection attacks possible
    - Proper error boundaries
    - Safe handling of special characters
```

## Test Implementation Strategy

### Phase 1: Current Functionality (Immediate)
1. Implement basic CLI command tests using existing BATS framework
2. Add web server API endpoint tests using existing test infrastructure
3. Extend current smoke tests in `e2e/tests/01-smoke/`

### Phase 2: Authentication Flow Preparation (Short-term)
1. Create mock server for testing authentication endpoints
2. Implement test fixtures for device codes and tokens
3. Set up test database with sample data

### Phase 3: End-to-End Authentication Testing (Medium-term)
1. Implement CLI authentication commands
2. Create full integration tests
3. Add browser automation for complete flow testing

### Phase 4: Advanced Testing (Long-term)
1. Performance and load testing
2. Security penetration testing
3. Cross-platform compatibility testing

## Test Environment Setup

### Local Development
```bash
# Start web server in test mode
cd turbo && pnpm dev

# Set up test database
pnpm test:db:setup

# Run CLI tests
cd e2e && ./run.sh

# Run API tests
cd turbo && pnpm test
```

### CI/CD Pipeline
- Automated testing on PR creation
- Integration tests against staging environment
- Security scans for authentication endpoints
- Performance benchmarking

## Success Criteria

### Phase 1 (Current State)
- ✅ All basic CLI commands tested
- ✅ All web server endpoints tested in isolation
- ✅ 100% test coverage for implemented features

### Phase 2 (Authentication Ready)
- 🔄 Mock authentication flow tested
- 🔄 Error handling validated
- 🔄 Security measures verified

### Phase 3 (Full Integration)
- 📋 End-to-end authentication flow working
- 📋 All planned CLI commands implemented and tested
- 📋 Cross-browser compatibility validated

## Test Tools and Frameworks

### Current Tools
- **BATS**: Bash testing for CLI commands
- **Vitest**: Unit testing for TypeScript code
- **MSW**: API mocking for isolated tests

### Recommended Additions
- **Playwright**: Browser automation for auth flow
- **Newman**: API collection testing
- **Docker**: Consistent test environments

## Risk Mitigation

### High-Risk Areas
1. **Authentication Security**: Token handling and storage
2. **Network Reliability**: Offline/poor connectivity scenarios
3. **Cross-Platform**: Different OS behaviors
4. **User Experience**: Error messages and recovery flows

### Mitigation Strategies
- Comprehensive security testing
- Network simulation tools
- Multi-platform CI testing
- User experience validation sessions

## Metrics and Monitoring

### Test Metrics
- Test coverage percentage
- Test execution time
- Failure rate trends
- Security scan results

### Quality Gates
- 95% test coverage for authentication code
- Zero high-severity security findings
- All integration tests passing
- Performance benchmarks met

---

*This test plan will be updated as new features are implemented and requirements evolve.*