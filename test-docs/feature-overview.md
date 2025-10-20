# Feature Overview

## Model Context Protocol (MCP) Server

The uSpark MCP server enables seamless project synchronization through the Model Context Protocol.

### Key Features

- **Real-time Sync**: Automatic synchronization of project files
- **Tool Integration**: Expose project operations as MCP tools
- **Authentication**: Secure token-based authentication
- **Version Control**: Track changes and maintain file history

### Available Tools

#### uspark_status
Get the current status of the MCP server and project sync state.

```typescript
await client.callTool({
  name: "uspark_status",
  arguments: {}
});
```

#### uspark_list_files
List all files currently tracked in the project.

```typescript
await client.callTool({
  name: "uspark_list_files",
  arguments: {}
});
```

#### uspark_pull
Pull the latest files from the remote server to local directory.

```typescript
await client.callTool({
  name: "uspark_pull",
  arguments: {}
});
```

## Architecture

The MCP server acts as a bridge between your local development environment and the uSpark platform:

```
Local Files <-> MCP Server <-> uSpark API <-> Cloud Storage
```

## Getting Started

1. Install the MCP server: `npm install -g @uspark/mcp-server`
2. Authenticate: Set `USPARK_TOKEN` environment variable
3. Configure: Set `USPARK_PROJECT_ID` to your project ID
4. Start: The server runs automatically on stdio
