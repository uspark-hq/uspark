# @uspark/mcp-server

Model Context Protocol (MCP) server for automatically syncing uSpark projects to your local `.uspark` directory.

## Features

- **Automatic Sync**: Periodically pulls your uSpark project to keep documentation up-to-date
- **MCP Tools**: Provides tools for Claude and other AI assistants to interact with your projects
- **Environment-Based Configuration**: All settings via environment variables, no config files needed

## Installation

```bash
npx @uspark/mcp-server
```

## Configuration

### For Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "uspark": {
      "command": "npx",
      "args": ["-y", "@uspark/mcp-server"],
      "env": {
        "USPARK_TOKEN": "your-authentication-token",
        "USPARK_PROJECT_ID": "your-project-id",
        "USPARK_API_URL": "https://www.uspark.ai",
        "USPARK_SYNC_INTERVAL": "3600000",
        "USPARK_OUTPUT_DIR": ".uspark"
      }
    }
  }
}
```

### Environment Variables

| Variable               | Required | Default                 | Description                      |
| ---------------------- | -------- | ----------------------- | -------------------------------- |
| `USPARK_TOKEN`         | ✅ Yes   | -                       | Your uSpark authentication token |
| `USPARK_PROJECT_ID`    | ✅ Yes   | -                       | The project ID to sync           |
| `USPARK_API_URL`       | No       | `https://www.uspark.ai` | API endpoint URL                 |
| `USPARK_SYNC_INTERVAL` | No       | `3600000` (1 hour)      | Sync interval in milliseconds    |
| `USPARK_OUTPUT_DIR`    | No       | `.uspark`               | Local directory for synced files |

### Getting Your Token

1. Run `uspark auth login` with the CLI
2. Your token will be stored in `~/.uspark/auth.json`
3. Copy the token to your MCP configuration

## Available Tools

The MCP server provides these tools for AI assistants:

### `uspark_pull`

Manually trigger a sync to pull the latest files from your project.

```
Agent: Use the uspark_pull tool to sync the project
```

### `uspark_status`

Check the current sync configuration and status.

```
Agent: Use the uspark_status tool to see configuration
```

### `uspark_list_files`

List all files in the remote project.

```
Agent: Use the uspark_list_files tool to see available files
```

## How It Works

1. **Startup**: The MCP server loads configuration and performs an initial sync
2. **Background Sync**: Automatically syncs at the configured interval
3. **MCP Tools**: Responds to tool calls from Claude or other MCP clients
4. **Local Files**: All synced files are stored in the configured output directory

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

## Architecture

- **Configuration**: Environment-based, no files
- **Sync**: Uses `@uspark/core` ProjectSync for file operations
- **Transport**: stdio for MCP communication
- **Storage**: Local filesystem (`.uspark` directory)

## Troubleshooting

### "Missing required environment variables"

Ensure `USPARK_TOKEN` and `USPARK_PROJECT_ID` are set in your MCP client configuration.

### "Failed to pull project"

- Verify your token is valid
- Check that the project ID exists
- Ensure you have access to the project

### Files not syncing

- Check the logs (stderr) for sync errors
- Verify the sync interval is appropriate
- Ensure the output directory is writable

## Related Packages

- [`@uspark/cli`](../cli) - Command-line interface for uSpark
- [`@uspark/core`](../core) - Core functionality shared across packages

## License

See the main [LICENSE](../../LICENSE) file.
