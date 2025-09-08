# E2B Claude Code Sandbox Template

This directory contains the E2B sandbox template for running Claude Code in isolated environments.

## Structure

- `Dockerfile` - Defines the sandbox environment with Node.js and necessary dependencies
- `e2b.toml` - E2B template configuration

## Build Process

### Automatic (GitHub Actions)

The template is automatically built and deployed via GitHub Actions:

- **On Pull Requests**: Template is built but not pushed (dry run)
- **On Main Branch**: Template is built and pushed to E2B registry

### Manual Build

To build and push the template manually:

```bash
# Install E2B CLI
npm install -g @e2b/cli

# Set your API key
export E2B_API_KEY=your_api_key_here

# Build the template
e2b template build --name "claude-code-sandbox" --dockerfile ./Dockerfile

# Push to E2B registry (production only)
e2b template push --name "claude-code-sandbox"

# List templates to get the ID
e2b template list
```

## Using the Template

Once deployed, update the API endpoint to use the template ID:

```typescript
const sandbox = await Sandbox.create({
  apiKey: env().E2B_API_KEY,
  template: "claude-code-sandbox", // or use the template ID
  timeoutMs: 600_000,
});
```

## Environment Variables

- `E2B_API_KEY` - Required for authentication with E2B service

## Notes

- The sandbox includes Node.js 20 LTS
- Default timeout is set to 10 minutes (600,000ms)
- Working directory is `/home/user/workspace`
