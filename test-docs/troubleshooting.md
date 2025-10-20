# Troubleshooting Guide

## Common Issues and Solutions

### MCP Server Connection Issues

**Problem:** MCP server fails to connect

**Solutions:**
1. Check that the server is running: `ps aux | grep mcp-server`
2. Verify environment variables are set correctly
3. Check firewall settings
4. Review server logs for error messages

### Authentication Failures

**Problem:** "Unauthorized" or "Invalid token" errors

**Solutions:**
1. Verify token is valid: `uspark auth whoami`
2. Check token hasn't expired
3. Ensure token has correct permissions
4. Re-authenticate: `uspark auth login`

### File Sync Issues

**Problem:** Files not syncing properly

**Solutions:**
1. Check sync interval: `USPARK_SYNC_INTERVAL` environment variable
2. Verify network connectivity to API server
3. Check file permissions in output directory
4. Review sync logs for specific errors
5. Try manual sync: use `uspark_pull` tool

### Build Failures

**Problem:** MCP server fails to build

**Solutions:**
1. Clear build cache: `rm -rf dist`
2. Reinstall dependencies: `pnpm install`
3. Check Node.js version (requires Node 18+)
4. Verify all dependencies are installed correctly

### Performance Issues

**Problem:** Slow sync or high CPU usage

**Solutions:**
1. Increase sync interval to reduce frequency
2. Exclude large files or directories
3. Check network bandwidth
4. Monitor system resources
5. Review number of files being synced

## Debug Mode

Enable debug logging:

```bash
export DEBUG=uspark:*
export LOG_LEVEL=debug
```

## Getting Help

If you continue to experience issues:

1. Check the [documentation](https://docs.uspark.ai)
2. Search [GitHub issues](https://github.com/uspark-hq/uspark/issues)
3. Join our [Discord community](https://discord.gg/uspark)
4. Contact support at support@uspark.ai

## Reporting Bugs

When reporting bugs, include:

- MCP server version: `uspark-mcp --version`
- Node.js version: `node --version`
- Operating system and version
- Complete error message and stack trace
- Steps to reproduce the issue
- Relevant configuration and environment variables (redact sensitive data)
