import { window, OutputChannel } from "vscode";

/**
 * Logger for uSpark extension
 * Outputs to VSCode Output panel under "uSpark" channel
 */
class Logger {
  private channel: OutputChannel | null = null;

  /**
   * Initialize the logger (should be called once during activation)
   */
  init(): void {
    if (!this.channel) {
      this.channel = window.createOutputChannel("uSpark");
    }
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.channel?.show();
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    const timestamp = new Date().toISOString();
    this.channel?.appendLine(`[${timestamp}] [INFO] ${message}`);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown): void {
    const timestamp = new Date().toISOString();
    this.channel?.appendLine(`[${timestamp}] [ERROR] ${message}`);
    if (error instanceof Error) {
      this.channel?.appendLine(`  ${error.message}`);
      if (error.stack) {
        this.channel?.appendLine(`  ${error.stack}`);
      }
    } else if (error) {
      this.channel?.appendLine(`  ${String(error)}`);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    const timestamp = new Date().toISOString();
    this.channel?.appendLine(`[${timestamp}] [WARN] ${message}`);
  }

  /**
   * Log a debug message
   */
  debug(message: string): void {
    const timestamp = new Date().toISOString();
    this.channel?.appendLine(`[${timestamp}] [DEBUG] ${message}`);
  }

  /**
   * Dispose the output channel
   */
  dispose(): void {
    this.channel?.dispose();
    this.channel = null;
  }
}

// Export singleton instance
export const logger = new Logger();
