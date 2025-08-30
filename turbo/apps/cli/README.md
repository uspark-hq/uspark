# makita-cli

The CLI application - a modern command-line tool.

## Installation

This package is part of the turbo monorepo. Install dependencies from the root:

```bash
pnpm install
```

## Development

### Build the CLI

```bash
pnpm build
```

### Development mode (watch)

```bash
pnpm dev
```

### Running tests

```bash
pnpm test
```

### Type checking

```bash
pnpm check-types
```

### Linting

```bash
pnpm lint
```

## Usage

After building, you can run the CLI:

```bash
# From the apps/cli directory
node dist/index.js

# Or using the binary name
./dist/index.js hello
```

## Available Commands

- `hello` - Display a welcome message
- `info` - Show system information
- `--version` - Show CLI version
- `--help` - Show help information

## Architecture

The CLI is built with:

- **Commander.js** - Command-line interface framework
- **Chalk** - Terminal string styling
- **tsup** - TypeScript bundler for fast builds
- **@makita/core** - Shared core functionality
