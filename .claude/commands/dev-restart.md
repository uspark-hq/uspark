---
command: dev-restart
description: Restart the development server (stop and start)
---

Restarts the Turbo development server by stopping the current instance and starting a new one.

Usage: `/dev-restart`

## What to do:

1. **Find and stop any running dev server:**
   ```bash
   # List all background bash shells to find dev server
   # Look for shells running "pnpm dev"
   ```

   For each dev server shell found:
   - Use `KillShell({ shell_id: "<id>" })` to stop it
   - Wait 2 seconds for processes to fully terminate

2. **Generate SSL certificates if needed:**
   Check if certificates exist, generate if missing:
   ```bash
   CERT_DIR="/workspaces/uspark2/.certs"

   # Check if all required certificates exist
   if [ ! -f "$CERT_DIR/www.uspark.dev.pem" ] || \
      [ ! -f "$CERT_DIR/app.uspark.dev.pem" ] || \
      [ ! -f "$CERT_DIR/docs.uspark.dev.pem" ] || \
      [ ! -f "$CERT_DIR/uspark.dev.pem" ]; then
     # Use the generate-certs script
     bash /workspaces/uspark2/turbo/scripts/generate-certs.sh
   else
     echo "✅ SSL certificates already exist"
   fi
   ```

3. **Start dev server in background:**
   Use Bash tool with `run_in_background: true`:
   ```bash
   cd /workspaces/uspark2/turbo && pnpm dev --ui=stream
   ```

4. **Show the shell ID:**
   Display the shell_id returned by the Bash tool so user knows which process to monitor.

5. **Show completion message:**
   ```
   🔄 Dev server restarted successfully (shell_id: <id>)

   Next steps:
   - Use `/dev-logs` to view server output
   - Use `/dev-logs [pattern]` to filter logs (e.g., `/dev-logs error`)
   - Use `/dev-stop` to stop the server
   ```

Note: This command is useful when you need to reload configuration changes or clear stale processes.
