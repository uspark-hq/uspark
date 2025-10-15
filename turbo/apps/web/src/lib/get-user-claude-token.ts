import { env } from "../env";

/**
 * Get the Claude token from environment variable
 * In MVP, all users share the same default Claude token
 *
 * @returns The Claude API token
 */
export function getClaudeToken(): string {
  return env().DEFAULT_CLAUDE_TOKEN;
}
