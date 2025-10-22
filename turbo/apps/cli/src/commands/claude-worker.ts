import { spawn } from "child_process";
import { createInterface } from "readline";
import chalk from "chalk";
import { requireAuth } from "./shared";
import { WorkerApiClient } from "../worker-api";

const SLEEP_SIGNAL = "###USPARK_WORKER_SLEEP###";
const DEFAULT_SLEEP_DURATION_MS = 60000; // 60 seconds
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

export async function claudeWorkerCommand(options: {
  id: string;
  projectId: string;
  verbose?: boolean;
}): Promise<void> {
  const context = await requireAuth();

  const { id, projectId, verbose = false } = options;

  // Support max iterations for testing (via environment variable)
  const maxIterations = process.env.MAX_ITERATIONS
    ? parseInt(process.env.MAX_ITERATIONS, 10)
    : Infinity;

  // Support custom sleep duration for testing (via environment variable)
  const sleepDurationMs = process.env.SLEEP_DURATION_MS
    ? parseInt(process.env.SLEEP_DURATION_MS, 10)
    : DEFAULT_SLEEP_DURATION_MS;

  console.log(chalk.cyan(`[uspark] Starting Claude Worker #${id}`));
  console.log(chalk.cyan(`[uspark] Project ID: ${projectId}`));
  console.log(chalk.cyan(`[uspark] Press Ctrl+C to stop\n`));

  // Initialize worker API client
  const workerApi = new WorkerApiClient(context.apiUrl, context.token);

  // Start heartbeat timer - sends heartbeat every 30 seconds
  const heartbeatTimer = setInterval(async () => {
    try {
      await workerApi.sendHeartbeat(projectId, {
        name: `worker-${id}`,
      });
      console.log(chalk.gray("[uspark] Heartbeat sent"));
    } catch (error) {
      console.error(
        chalk.red(
          `[uspark] Failed to send heartbeat: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }, HEARTBEAT_INTERVAL_MS);

  let iteration = 0;

  try {
    while (iteration < maxIterations) {
      iteration++;
      console.log(chalk.yellow(`\n=== Iteration ${iteration} ===`));

      try {
        // Phase 1: Pull files from remote
        console.log(chalk.blue("[uspark] Phase 1: Pulling files..."));
        await syncFiles("pull", projectId);

        // Phase 2: Execute Claude
        console.log(chalk.blue("[uspark] Phase 2: Executing Claude..."));
        const shouldSleep = await executeClaude(id, verbose);

        // Phase 3: Push files to remote
        console.log(chalk.blue("[uspark] Phase 3: Pushing files..."));
        await syncFiles("push", projectId);

        // Phase 4: Determine next action
        if (shouldSleep) {
          console.log(
            chalk.yellow(
              `[uspark] Sleep signal detected. Waiting ${sleepDurationMs / 1000} seconds...`,
            ),
          );
          await sleep(sleepDurationMs);
        } else {
          console.log(chalk.green("[uspark] Continuing immediately..."));
        }
      } catch (error) {
        console.error(
          chalk.red(
            `[uspark] Error in iteration ${iteration}: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        console.log(
          chalk.yellow(
            `[uspark] Waiting ${sleepDurationMs / 1000} seconds before retry...`,
          ),
        );
        await sleep(sleepDurationMs);
      }
    }
  } finally {
    // Clean up heartbeat timer to allow process to exit
    clearInterval(heartbeatTimer);
  }
}

/**
 * Execute uspark pull or push in .uspark directory
 */
async function syncFiles(
  action: "pull" | "push",
  projectId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [action, "--project-id", projectId];

    const proc = spawn("uspark", args, {
      cwd: ".uspark",
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`uspark ${action} failed with exit code ${code}`));
      }
    });

    proc.on("error", (error) => {
      reject(new Error(`Failed to spawn uspark ${action}: ${error.message}`));
    });
  });
}

/**
 * Execute Claude with the worker prompt
 * Returns true if sleep signal was detected
 */
async function executeClaude(
  taskId: string,
  verbose: boolean,
): Promise<boolean> {
  const prompt = buildWorkerPrompt(taskId);

  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      [
        "--continue",
        "--print",
        "--verbose",
        "--output-format",
        "stream-json",
        "--dangerously-skip-permissions",
      ],
      {
        stdio: ["pipe", "pipe", "inherit"],
      },
    );

    let sleepDetected = false;

    // Send prompt to stdin
    proc.stdin.write(prompt);
    proc.stdin.end();

    // Create readline interface for stdout
    const rl = createInterface({
      input: proc.stdout,
      terminal: false,
    });

    rl.on("line", (line: string) => {
      // Check for sleep signal
      if (line.includes(SLEEP_SIGNAL)) {
        sleepDetected = true;
      }

      // Filter output based on verbose flag
      if (verbose) {
        // In verbose mode, output everything
        console.log(line);
      } else {
        // In non-verbose mode, only output the result field from result blocks
        try {
          const block = JSON.parse(line);
          if (block.type === "result" && "result" in block) {
            console.log(block.result);
          }
        } catch {
          // Not JSON or parsing error - skip silently
        }
      }
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(sleepDetected);
      } else {
        reject(new Error(`Claude process failed with exit code ${code}`));
      }
    });

    proc.on("error", (error) => {
      reject(new Error(`Failed to spawn Claude: ${error.message}`));
    });
  });
}

/**
 * Build the worker prompt
 */
function buildWorkerPrompt(taskId: string): string {
  return `You are a uSpark Worker. Your tasks:
1. Read the task from .uspark/tasks/task-${taskId}.md
2. Understand the current progress and execute the next step
3. Update the task file to record your progress
4. If the task is completed or cannot continue, output: ${SLEEP_SIGNAL}
`;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
