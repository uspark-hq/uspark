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
}): Promise<void> {
  const context = await requireAuth();

  const { id, projectId } = options;

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

  // Register worker with the server
  console.log(chalk.blue("[uspark] Registering worker..."));
  const worker = await workerApi.registerWorker(projectId, {
    name: `worker-${id}`,
  });
  const workerId = worker.id;
  console.log(chalk.green(`[uspark] Worker registered: ${workerId}\n`));

  // Start heartbeat timer
  const heartbeatTimer = setInterval(async () => {
    try {
      await workerApi.sendHeartbeat(projectId, workerId);
      console.log(chalk.gray("[uspark] Heartbeat sent"));
    } catch (error) {
      console.error(
        chalk.red(
          `[uspark] Failed to send heartbeat: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Cleanup function
  const cleanup = async () => {
    clearInterval(heartbeatTimer);

    try {
      console.log(chalk.blue("\n[uspark] Unregistering worker..."));
      await workerApi.unregisterWorker(projectId, workerId);
      console.log(chalk.green("[uspark] Worker unregistered"));
    } catch (error) {
      console.error(
        chalk.red(
          `[uspark] Failed to unregister worker: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  };

  // Handle process termination
  process.on("SIGINT", async () => {
    console.log(chalk.yellow("\n[uspark] Received SIGINT, shutting down..."));
    await cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log(chalk.yellow("\n[uspark] Received SIGTERM, shutting down..."));
    await cleanup();
    process.exit(0);
  });

  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    console.log(chalk.yellow(`\n=== Iteration ${iteration} ===`));

    try {
      // Phase 1: Pull files from remote
      console.log(chalk.blue("[uspark] Phase 1: Pulling files..."));
      await syncFiles("pull", projectId);

      // Phase 2: Execute Claude
      console.log(chalk.blue("[uspark] Phase 2: Executing Claude..."));
      const shouldSleep = await executeClaude(id);

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

  // Cleanup after completing all iterations
  await cleanup();
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
async function executeClaude(taskId: string): Promise<boolean> {
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
      // Pass through all output
      console.log(line);

      // Check for sleep signal
      if (line.includes(SLEEP_SIGNAL)) {
        sleepDetected = true;
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
