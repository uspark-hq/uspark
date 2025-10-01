---
command: dev-start
description: Start the development server in background mode
---

Starts the Turbo development server in the background with stream UI mode.

Usage: `/dev-start`

## What to do:

1. **Check if dev server is already running:**
   ```bash
   pgrep -f "pnpm dev"
   ```
   If running, show warning and suggest using `/dev-stop` first.

2. **Start dev server in background:**
   Use Bash tool with `run_in_background: true`:
   ```bash
   cd turbo && pnpm dev --ui=stream
   ```

3. **Show the shell ID:**
   Display the shell_id returned by the Bash tool so user knows which process to monitor.

4. **Show next steps:**
   ```
   ✅ Dev server started in background (shell_id: <id>)

   Next steps:
   - Use `/dev-logs` to view server output
   - Use `/dev-logs [pattern]` to filter logs (e.g., `/dev-logs error`)
   - Use `/dev-stop` to stop the server
   ```

Note: The `--ui=stream` flag ensures non-interactive output suitable for background monitoring.