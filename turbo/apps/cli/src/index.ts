import { FOO, FileSystem } from "@uspark/core";
import { Command } from "commander";
import chalk from "chalk";

const program = new Command();

program
  .name("uspark")
  .description("uSpark CLI - A modern build tool")
  .version("0.1.0");

program
  .command("hello")
  .description("Say hello from the App")
  .action(() => {
    console.log(chalk.blue("Welcome to the uSpark CLI!"));
    console.log(chalk.green(`Core says: ${FOO}`));
  });

program
  .command("info")
  .description("Display environment information")
  .action(() => {
    console.log(chalk.cyan("System Information:"));
    console.log(`Node Version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
  });

program
  .command("pull")
  .description("Pull a file from remote project")
  .argument("<filePath>", "File path to pull")
  .requiredOption("--project-id <projectId>", "Project ID")
  .option("--output <outputPath>", "Local output path (defaults to same as remote path)")
  .action(async (filePath: string, options: { projectId: string; output?: string }) => {
    try {
      await pullCommand(filePath, options);
    } catch (error) {
      console.error(chalk.red(`✗ Failed to pull file: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

export async function pullCommand(
  filePath: string,
  options: { projectId: string; output?: string }
): Promise<void> {
  console.log(chalk.blue(`Pulling ${filePath} from project ${options.projectId}...`));
  
  const fs = new FileSystem();
  await fs.pullFile(options.projectId, filePath, options.output);
  
  const outputPath = options.output || filePath;
  console.log(chalk.green(`✓ Successfully pulled to ${outputPath}`));
}

if (require.main === module) {
  program.parse();
}
