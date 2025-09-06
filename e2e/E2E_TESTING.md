# uSpark E2E Testing Guide

This directory contains two types of E2E tests:

## 1. CLI E2E Tests (BATS)

Located in `/e2e/tests/`, these test the uSpark CLI functionality.

### Running CLI Tests

```bash
# Run all CLI tests
./run.sh

# Run specific test file
./run.sh tests/02-token/t02-token.bats

# Test against different API hosts
API_HOST=https://app.uspark.ai ./run.sh
API_HOST=http://localhost:3000 ./run.sh
API_HOST=https://staging.uspark.ai ./run.sh
```

### Environment Variables

- `API_HOST`: Target API server (default: `https://app.uspark.ai`)
- `USPARK_TOKEN`: Authentication token for CLI

## 2. Web E2E Tests (Playwright)

Located in `/e2e/web/`, these test the web application UI.

### Setup

```bash
cd web
npm install
```

### Running Web Tests

```bash
# Test public access (no auth required)
npm run test:public

# Test against production with auth
npm run test:prod

# Test against different environments
BASE_URL=https://app.uspark.ai npm test
BASE_URL=https://staging.uspark.ai npm test
BASE_URL=http://localhost:3000 npm test
```

### Authentication Methods

Configure authentication in `.env.local`:

#### Method 1: Email/Password
```env
CLERK_TEST_EMAIL=test@example.com
CLERK_TEST_PASSWORD=password123
```

#### Method 2: Session Token
```env
CLERK_TEST_SESSION_TOKEN=eyJ...
```

#### Method 3: Clerk Testing Token
```env
CLERK_TEST_TOKEN=test_token_xxx
```

## Testing Strategy

### Local Development
```bash
# Start local server
cd turbo && pnpm dev

# Run tests against localhost
API_HOST=http://localhost:3000 ./run.sh  # CLI
BASE_URL=http://localhost:3000 npm test   # Web
```

### Staging/Preview
```bash
API_HOST=https://staging.uspark.ai ./run.sh
BASE_URL=https://staging.uspark.ai npm test
```

### Production
```bash
API_HOST=https://app.uspark.ai ./run.sh
BASE_URL=https://app.uspark.ai npm test
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run CLI E2E Tests
  env:
    API_HOST: ${{ vars.API_HOST }}
    USPARK_TOKEN: ${{ secrets.E2E_TEST_TOKEN }}
  run: ./e2e/run.sh

- name: Run Web E2E Tests  
  env:
    BASE_URL: ${{ vars.BASE_URL }}
    CLERK_TEST_TOKEN: ${{ secrets.CLERK_TEST_TOKEN }}
  run: |
    cd e2e/web
    npm install
    npm test
```