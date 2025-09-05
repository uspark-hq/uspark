import chalk from "chalk";
import { getToken, getApiUrl } from "../config";
import { ProjectSync } from "../project-sync";

export interface AuthenticatedContext {
  token: string;
  apiUrl: string;
  sync: ProjectSync;
}

export async function requireAuth(): Promise<AuthenticatedContext> {
  const token = await getToken();
  if (!token) {
    console.error(
      chalk.red("✗ Not authenticated. Please run 'uspark auth login' first."),
    );
    throw new Error("Not authenticated");
  }

  const apiUrl = await getApiUrl();
  const sync = new ProjectSync();

  return { token, apiUrl, sync };
}

export async function syncFile(
  context: AuthenticatedContext,
  projectId: string,
  filePath: string,
  sourcePath?: string,
): Promise<void> {
  await context.sync.pushFile(
    projectId,
    filePath,
    {
      token: context.token,
      apiUrl: context.apiUrl,
    },
    sourcePath,
  );
}
