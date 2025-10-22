import { spawn } from "child_process";
import { createInterface } from "readline";
import chalk from "chalk";
import { requireAuth } from "./shared";
import { WorkerApiClient } from "../worker-api";
import { getOrCreateWorkerId } from "../project-config";

const SLEEP_SIGNAL = "###USPARK_WORKER_SLEEP###";
const CONTINUE_SIGNAL = "###USPARK_WORKER_CONTINUE###";
const DEFAULT_SLEEP_DURATION_MS = 60000; // 60 seconds
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

export async function claudeWorkerCommand(options: {
  projectId: string;
  verbose?: boolean;
}): Promise<void> {
  const context = await requireAuth();

  const { projectId, verbose = false } = options;

  // Support max iterations for testing (via environment variable)
  const maxIterations = process.env.MAX_ITERATIONS
    ? parseInt(process.env.MAX_ITERATIONS, 10)
    : Infinity;

  // Support custom sleep duration for testing (via environment variable)
  const sleepDurationMs = process.env.SLEEP_DURATION_MS
    ? parseInt(process.env.SLEEP_DURATION_MS, 10)
    : DEFAULT_SLEEP_DURATION_MS;

  // Initialize workerId in .uspark/.config.json
  const workerId = await getOrCreateWorkerId(".uspark");

  console.log(chalk.cyan(`[uspark] Starting Claude Worker`));
  console.log(chalk.cyan(`[uspark] Worker ID: ${workerId}`));
  console.log(chalk.cyan(`[uspark] Project ID: ${projectId}`));
  console.log(chalk.cyan(`[uspark] Press Ctrl+C to stop\n`));

  // Initialize worker API client
  const workerApi = new WorkerApiClient(context.apiUrl, context.token);

  // Start heartbeat timer - sends heartbeat every 30 seconds
  const heartbeatTimer = setInterval(async () => {
    try {
      await workerApi.sendHeartbeat(projectId, {
        name: `worker-${workerId}`,
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
        const action = await executeClaude(workerId, verbose);

        // Phase 3: Push files to remote
        console.log(chalk.blue("[uspark] Phase 3: Pushing files..."));
        await syncFiles("push", projectId);

        // Phase 4: Determine next action
        if (action === "sleep") {
          console.log(
            chalk.yellow(
              `[uspark] Sleep signal detected. Waiting ${sleepDurationMs / 1000} seconds...`,
            ),
          );
          await sleep(sleepDurationMs);
        } else if (action === "continue") {
          console.log(
            chalk.green(
              "[uspark] Continue signal detected. Proceeding immediately...",
            ),
          );
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
 * Returns the detected action signal: "sleep", "continue", or "none"
 */
async function executeClaude(
  workerId: string,
  verbose: boolean,
): Promise<"sleep" | "continue" | "none"> {
  const prompt = buildWorkerPrompt(workerId);

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

    let detectedAction: "sleep" | "continue" | "none" = "none";

    // Send prompt to stdin
    proc.stdin.write(prompt);
    proc.stdin.end();

    // Create readline interface for stdout
    const rl = createInterface({
      input: proc.stdout,
      terminal: false,
    });

    rl.on("line", (line: string) => {
      // Check for action signals
      if (line.includes(SLEEP_SIGNAL)) {
        detectedAction = "sleep";
      } else if (line.includes(CONTINUE_SIGNAL)) {
        detectedAction = "continue";
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
        resolve(detectedAction);
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
function buildWorkerPrompt(workerId: string): string {
  return `You are uSpark Worker #${workerId}. Follow these steps in order:

## Step 1: Check for Your Assigned Task

Look in \`.uspark/tasks/\` directory for task files (tasks-*.md format) that:
- Are NOT completed (check status field in the file)
- Have \`workerId: ${workerId}\` assigned

If you find such a task:
- Continue working on that task
- Update the task file with your progress
- If the task is completed, update the status to "completed" and move the file to \`.uspark/tasks/archive/\`
- Then output: ${SLEEP_SIGNAL}

## Step 2: Claim a New Task (if no assigned task found)

If no task with your workerId is found, look for tasks that:
- Are NOT completed
- Have NO workerId assigned (either missing workerId field or workerId is empty)

If you find such a task:
- Add \`workerId: ${workerId}\` to the task file (add it near the top, after the title)
- Report: "Claimed task: [task file name]"
- Then output: ${CONTINUE_SIGNAL}

## Step 3: Sleep (if no tasks available)

If there are no tasks to work on or claim:
- Output: ${SLEEP_SIGNAL}

## Important Notes

- Task files are named \`tasks-NAME.md\` (e.g., \`tasks-add-user-auth.md\`)
- Completed tasks should be in \`.uspark/tasks/archive/\`, not in \`.uspark/tasks/\`
- Use ${SLEEP_SIGNAL} when you finish working on a task or find no tasks (causes worker to sleep)
- Use ${CONTINUE_SIGNAL} when you claim a new task (causes worker to continue immediately)
- Do NOT create new tasks - only work on existing ones
`;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
