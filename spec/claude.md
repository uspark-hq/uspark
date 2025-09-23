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

### 3. Processing JSON Stream Output
```typescript
const lines = output.split('\n').filter(line => line.trim());
for (const line of lines) {
  const json = JSON.parse(line);

  switch(json.type) {
    case 'system':
      // Initialization info
      break;
    case 'assistant':
      // Claude's response
      if (json.message?.content?.[0]?.type === 'text') {
        console.log(json.message.content[0].text);
      }
      break;
    case 'tool_use':
      // Tool invocation
      console.log(`Using tool: ${json.name}`);
      break;
    case 'result':
      // Final result
      console.log(`Cost: $${json.total_cost_usd}`);
      break;
  }
}
```

## Common Issues

### Q: Why does Claude command hang?
A: Without the `--print` flag, Claude enters interactive mode waiting for input.

### Q: Why doesn't direct argument passing work?
A: Claude CLI in E2B containers has issues with direct arguments, pipe method is recommended.

### Q: Why does stream-json error saying it needs verbose?
A: When using `--output-format stream-json`, you must also add the `--verbose` flag.

### Q: How to know if Claude is working?
A: Use `--output-format stream-json` to see execution progress in realtime.

## Integration Example

### Complete E2B Claude Executor
```typescript
export class ClaudeExecutor {
  static async execute(
    sandbox: Sandbox,
    prompt: string
  ): Promise<ExecutionResult> {
    // Create temporary file
    const promptFile = `/tmp/prompt_${Date.now()}.txt`;
    await sandbox.files.write(promptFile, prompt);

    // Execute using pipe method
    const command = `cat "${promptFile}" | claude --print --verbose --output-format stream-json`;
    const result = await sandbox.commands.run(command);

    // Clean up temporary file
    await sandbox.commands.run(`rm -f "${promptFile}"`);

    // Parse JSON stream
    const blocks = [];
    if (result.stdout) {
      const lines = result.stdout.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            blocks.push(JSON.parse(line));
          } catch (e) {
            console.error('Failed to parse JSON:', line);
          }
        }
      }
    }

    return {
      success: result.exitCode === 0,
      output: result.stdout,
      blocks: blocks,
      error: result.stderr
    };
  }
}
```

## Performance Considerations

1. **First Execution is Slower**: Claude CLI may need initialization on first run, set longer timeouts
2. **Pipes are More Reliable**: Pipe input is more stable than direct arguments
3. **Stream Output**: Using `stream-json` allows earlier response processing

## Debugging Tips

1. **Check Environment Variables**
```bash
env | grep CLAUDE
```

2. **Use Debug Mode**
```bash
echo "test" | claude --debug --print
```

3. **Test Simple Commands**
```bash
echo "test" | timeout 10 claude --print
```

4. **Check Claude Version**
```bash
claude --version
```