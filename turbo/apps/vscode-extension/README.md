# Uspark VSCode Extension

Automatically sync workspace files with Uspark cloud.

## Features

- 🔄 Auto-sync every 5 minutes
- 📁 Supports `.uspark.json` and `.uspark/.config.json` configurations
- 📊 Status bar indicator showing sync status
- 🔧 Zero configuration required

## Development

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- VSCode >= 1.80.0

### Setup

```bash
# Install dependencies (from turbo root)
cd turbo
pnpm install

# Build the extension
pnpm --filter uspark-sync compile

# Or run in watch mode
pnpm --filter uspark-sync dev
```

### Debugging in VSCode

1. **Open the extension in VSCode:**

   ```bash
   code turbo/apps/vscode-extension
   ```

2. **Start the dev server (optional but recommended):**

   ```bash
   # In turbo root directory
   pnpm dev
   ```

   This will automatically rebuild the extension when you make changes.

3. **Launch the Extension Development Host:**
   - Press `F5` or click "Run > Start Debugging"
   - This opens a new VSCode window with your extension loaded

4. **Test the extension:**
   - Open a project that has `.uspark.json` or `.uspark/.config.json`
   - Check the status bar (bottom right) for sync indicator
   - Look for "$(sync) Auto Sync" status

5. **View logs:**
   - In the Extension Development Host window
   - Open "Help > Toggle Developer Tools"
   - Check the Console tab for log messages

### Launch Configuration

The extension includes a `.vscode/launch.json` configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
```

### Making Changes

1. Edit source files in `src/`
2. Changes will auto-compile if `pnpm dev` is running
3. Reload the Extension Development Host window:
   - Press `Cmd+R` (Mac) or `Ctrl+R` (Windows/Linux)
   - Or click "View > Command Palette > Developer: Reload Window"

## Building

```bash
# Build for production
pnpm --filter uspark-sync compile

# Package as .vsix
pnpm --filter uspark-sync vscode:package
```

## Publishing

```bash
# Publish to VSCode Marketplace
pnpm --filter uspark-sync vscode:publish -p <PAT_TOKEN>
```

## Testing

```bash
# Run unit tests (from turbo root)
pnpm vitest --project vscode-extension --run
```

## Project Structure

```
apps/vscode-extension/
├── src/
│   ├── extension.ts       # Extension entry point
│   ├── config.ts          # Configuration loader
│   └── __tests__/         # Unit tests
├── out/                   # Compiled JavaScript
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript configuration
└── README.md             # This file
```

## Configuration Files

The extension activates when it detects:

- `.uspark.json` in workspace root
- `.uspark/.config.json` in workspace

Example config:

```json
{
  "projectId": "your-project-id",
  "version": "1"
}
```

## Status Indicators

| Icon                    | Meaning                     |
| ----------------------- | --------------------------- |
| $(sync) Auto Sync       | Idle, waiting for next sync |
| $(sync~spin) Syncing... | Sync in progress            |
| $(check) Synced         | Sync completed successfully |

## Troubleshooting

**Extension not activating:**

- Ensure you have `.uspark.json` or `.uspark/.config.json` in your workspace
- Check VSCode output panel for errors

**Build errors:**

- Run `pnpm install` in turbo root
- Delete `out/` directory and rebuild

**Can't debug:**

- Ensure TypeScript is compiled (`pnpm compile`)
- Check that `out/` directory contains `.js` files

## Links

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
