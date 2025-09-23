# Claude CLI Usage Guide

This document summarizes our experience and best practices for using Claude CLI in E2B containers.

## Key Concepts

### Interactive vs Non-interactive Mode

Claude CLI has two operating modes:

1. **Interactive Mode (Default)**: Starts an interactive session waiting for user input
   - Running `claude` or `claude "prompt"` directly enters interactive mode
   - Causes hanging in automation scripts

2. **Non-interactive Mode**: Processes input and outputs result then exits
   - Must use the `--print` flag
   - Suitable for scripts and automation

## Important Flags

### `--print` (short `-p`)
- **Meaning**: Print response and exit (useful for pipes)
- **Purpose**: Enables non-interactive mode where Claude processes input and exits directly
- **Note**: Without this flag, Claude enters interactive session causing hangs

### `--verbose`
- **Meaning**: Enable verbose output mode
- **Required**: Must be added when using `--output-format stream-json` with `--print`
- **Purpose**: Outputs more detailed execution information

### `--output-format`
Specifies output format with three options:

#### 1. `text` (default)
```bash
echo "What is 2+2?" | claude --print
# Output: 4
```
- Plain text response
- Suitable for simple interactions

#### 2. `json` (single result)
```bash
echo "What is 2+2?" | claude --print --output-format json
```
Outputs a single complete JSON object containing:
- `result`: Actual response content
- `session_id`: Session ID
- `total_cost_usd`: Cost
- `usage`: Token usage statistics
- `modelUsage`: Model usage details
- `duration_ms`: Execution time

Suitable for scenarios requiring statistics and cost tracking.

#### 3. `stream-json` (realtime stream)
```bash
echo "prompt" | claude --print --verbose --output-format stream-json
```
Outputs multiple JSON objects (one per line), including in order:
1. `system` object - Initialization info (tools, model, session ID)
2. `assistant` object - Claude's responses and tool calls
3. `tool_use` object - Tool invocation requests (if any)
4. `tool_result` object - Tool execution results (if any)
5. `result` object - Final result and statistics

**Characteristics**:
- Each JSON object is complete, not fragments
- Realtime line-by-line output, can be processed as stream
- Suitable for scenarios requiring progress display and execution monitoring

## Working Command Formats

### ✅ Recommended Approaches

1. **Pipe Input (Most Reliable)**
```bash
echo "your prompt" | claude --print
cat prompt.txt | claude --print
```

2. **With JSON Stream Output**
```bash
echo "prompt" | claude --print --verbose --output-format stream-json
```

3. **Simple One-time Execution**
```bash
echo "test" | claude --print
```

### ❌ Non-working Approaches

1. **Direct Argument Causes Hanging**
```bash
claude --print "prompt"  # Timeout
```

2. **File Argument Also Hangs**
```bash
claude -p /tmp/file.txt  # Timeout (Note: -p is short for --print, not file specification)
```

3. **stream-json Without --verbose**
```bash
claude --print --output-format stream-json "prompt"  # Error: requires --verbose
```

## E2B Container Requirements

### Required Environment Variables
- `CLAUDE_CODE_OAUTH_TOKEN`: Claude OAuth authentication token (required)
- Set via `envs` parameter when creating sandbox

### Pre-installed Software
E2B template `w6qe4mwx23icyuytq64y` comes with:
- Claude CLI v1.0.117
- uSpark CLI v0.9.2
- Node.js and npm

## Best Practices in E2B

### 1. Set OAuth Token When Creating Sandbox
```typescript
const sandbox = await Sandbox.create(TEMPLATE_ID, {
  timeout: 300,
  envs: {
    CLAUDE_CODE_OAUTH_TOKEN: userOAuthToken,
  },
});
```

### 2. Use Pipe Method for Execution
```typescript
// Recommended: Use pipe
const command = `cat "${promptFile}" | claude --print --verbose --output-format stream-json`;
const result = await sandbox.commands.run(command);

// Or direct echo
const result = await sandbox.commands.run(
  `echo "${prompt}" | claude --print`
);
```

### 3. Real-time Streaming with Callbacks
E2B SDK supports real-time output streaming via callbacks in the `run` method:

```typescript
// Real-time streaming - get output as it arrives
const result = await sandbox.commands.run(
  'cat prompt.txt | claude --print --verbose --output-format stream-json',
  {
    onStdout: async (data: string) => {
      // Process streaming data in real-time
      console.log('Received:', data);
    },
    onStderr: (data: string) => {
      console.error('Error:', data);
    }
  }
);
```

**Note**: The callbacks receive data as strings, and for JSON stream output, you may receive partial lines that need buffering.

### 4. Processing JSON Stream Output
For real-time processing of Claude's JSON stream:

```typescript
let buffer = '';
const blocks = [];

const result = await sandbox.commands.run(command, {
  onStdout: async (data: string) => {
    buffer += data;
    const lines = buffer.split('\n');

    // Keep potentially incomplete last line
    buffer = lines[lines.length - 1];

    // Process complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const block = JSON.parse(line);
          blocks.push(block);

          // Process block in real-time
          await processBlock(block);
        } catch (e) {
          console.error('Parse error:', line);
        }
      }
    }
  }
});
```

This approach ensures:
- Each JSON block is processed as soon as it arrives
- Partial lines are properly buffered
- Real-time updates can be sent to clients
- Database operations happen immediately

## Common Issues

### Q: Why does Claude command hang?
A: Without the `--print` flag, Claude enters interactive mode waiting for input.

### Q: Why doesn't direct argument passing work?
A: Claude CLI in E2B containers has issues with direct arguments, pipe method is recommended.

### Q: Why does stream-json error saying it needs verbose?
A: When using `--output-format stream-json`, you must also add the `--verbose` flag.

### Q: How to know if Claude is working?
A: Use `--output-format stream-json` to see execution progress in realtime.

## Production Integration

### E2B Sandbox Management with Session Reuse
```typescript
export class E2BExecutor {
  private static readonly SANDBOX_TIMEOUT = 1800; // 30 minutes
  private static readonly TEMPLATE_ID = "w6qe4mwx23icyuytq64y"; // uSpark Claude template

  /**
   * Get or create a sandbox for a session (reuses existing sandboxes)
   */
  static async getSandboxForSession(
    sessionId: string,
    projectId: string,
    userId: string
  ): Promise<Sandbox> {
    // Try to find existing sandbox
    const paginator = await Sandbox.list();
    const sandboxes = await paginator.nextItems();
    const existingSandbox = sandboxes.find(
      (s: any) => s.metadata?.sessionId === sessionId
    );

    if (existingSandbox) {
      try {
        // Reconnect to existing sandbox
        const sandbox = await Sandbox.connect(existingSandbox.sandboxId);
        await sandbox.setTimeout(this.SANDBOX_TIMEOUT * 1000);
        return sandbox;
      } catch (error) {
        console.log("Failed to reconnect, will create new sandbox");
      }
    }

    // Create new sandbox with Claude OAuth token
    const claudeToken = await this.getUserClaudeToken(userId);
    if (!claudeToken) {
      throw new Error("User has not configured Claude OAuth token");
    }

    const sandbox = await Sandbox.create(this.TEMPLATE_ID, {
      timeout: this.SANDBOX_TIMEOUT,
      metadata: { sessionId, projectId, userId },
      envs: {
        CLAUDE_CODE_OAUTH_TOKEN: claudeToken,
        PROJECT_ID: projectId,
      },
    });

    return sandbox;
  }
}
```

### Real-time Claude Execution with Streaming
```typescript
static async executeClaude(
  sandbox: Sandbox,
  prompt: string,
  projectId: string,
  onBlock?: (block: any) => Promise<void>
): Promise<ExecutionResult> {
  // Create a temporary file for the prompt
  const promptFile = `/tmp/prompt_${Date.now()}.txt`;
  await sandbox.files.write(promptFile, prompt);

  const blocks: any[] = [];
  let buffer = '';

  // Use pipe method with real-time streaming
  const command = `cat "${promptFile}" | claude --print --verbose --output-format stream-json`;

  const result = await (sandbox.commands as any).run(command, {
    onStdout: async (data: string) => {
      // Buffer and process complete JSON lines
      buffer += data;
      const lines = buffer.split('\n');
      buffer = lines[lines.length - 1];

      // Process complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line) {
          try {
            const block = JSON.parse(line);
            blocks.push(block);

            // Real-time callback
            if (onBlock) {
              await onBlock(block);
            }
          } catch (e) {
            console.error('Failed to parse JSON line:', line);
          }
        }
      }
    },
    onStderr: (data: string) => {
      console.error('Claude stderr:', data);
    }
  });

  // Clean up
  await sandbox.commands.run(`rm -f "${promptFile}"`);

  return {
    success: result.exitCode === 0,
    blocks: blocks,
    totalCost: blocks.find(b => b.type === 'result')?.total_cost_usd,
    usage: blocks.find(b => b.type === 'result')?.usage,
  };
}
```

### Processing Blocks in Real-time
```typescript
// In ClaudeExecutor.execute()
const result = await E2BExecutor.executeClaude(
  sandbox,
  userPrompt,
  projectId,
  async (block) => {
    // Save blocks to database as they arrive
    if (block.type === 'assistant') {
      const content = block.message?.content?.[0];
      if (content?.type === 'text') {
        await this.saveBlock(turnId, {
          type: 'content',
          text: content.text
        }, sequenceNumber++);
      }
    } else if (block.type === 'tool_result') {
      await this.saveBlock(turnId, {
        type: 'tool_result',
        tool_use_id: block.tool_use_id,
        result: block.content,
      }, sequenceNumber++);
    } else if (block.type === 'result') {
      // Update turn with final statistics
      await db.update(TURNS_TBL).set({
        status: "completed",
        completedAt: new Date(),
        metadata: {
          totalCost: block.total_cost_usd,
          usage: block.usage,
          duration: block.duration_ms
        }
      }).where(eq(TURNS_TBL.id, turnId));
    }
  }
);
```

## Performance Considerations

1. **First Execution is Slower**: Claude CLI may need initialization on first run, set longer timeouts
2. **Pipes are More Reliable**: Pipe input is more stable than direct arguments
3. **Stream Output**: Using `stream-json` allows earlier response processing
4. **Sandbox Reuse**: Sandboxes persist for 30 minutes and can be reconnected for better performance
5. **Real-time Processing**: Blocks are processed and saved as they arrive, not batched

## Key Implementation Notes

### E2B SDK Paginator API
The `Sandbox.list()` method returns a paginator, not an array:
```typescript
const paginator = await Sandbox.list();
const sandboxes = await paginator.nextItems(); // Get first page
```

### Metadata for Session Tracking
Sandboxes store metadata to enable session-based reuse:
```typescript
metadata: {
  sessionId: string,
  projectId: string,
  userId: string
}
```

### Required Environment Variables
- `E2B_API_KEY`: E2B API authentication
- `CLAUDE_CODE_OAUTH_TOKEN`: User's Claude OAuth token (stored encrypted in database)
- `NODE_ENV`: Set to "development" for testing without encryption key

## Verified Working Configuration

- **E2B Template**: `w6qe4mwx23icyuytq64y` (uSpark Claude template)
- **Claude CLI**: v1.0.117 (pre-installed in template)
- **Command Format**: `cat prompt.txt | claude --print --verbose --output-format stream-json`
- **Real-time Streaming**: Uses E2B's `onStdout` callback for immediate block processing
- **Database Updates**: Blocks saved immediately as they arrive, not after completion