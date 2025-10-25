import {
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  window,
  workspace,
  commands,
} from "vscode";
import { loadConfig } from "./config";
import { AuthManager } from "./auth";
import { ApiClient } from "./api";

const SYNC_INTERVAL = 300000; // 5 分钟

async function sync(
  projectId: string,
  workDir: string,
  statusBar: StatusBarItem,
  authManager: AuthManager,
  api: ApiClient,
) {
  // Check authentication
  const token = await authManager.getToken();
  if (!token) {
    console.log("[Uspark] Sync skipped: not authenticated");
    return;
  }

  console.log(`[Uspark] Sync triggered for project ${projectId} in ${workDir}`);
  statusBar.text = "$(sync~spin) Syncing...";

  try {
    await api.sync(token, projectId, workDir);
    statusBar.text = "$(check) Synced";
    // Update status bar immediately after sync - no artificial delay needed
    await updateStatusBar(statusBar, authManager);
  } catch (error) {
    console.error("[Uspark] Sync failed:", error);
    statusBar.text = "$(error) Sync failed";
    void window.showErrorMessage(`Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    await updateStatusBar(statusBar, authManager);
  }
}

async function updateStatusBar(
  statusBar: StatusBarItem,
  authManager: AuthManager,
) {
  const isAuthenticated = await authManager.isAuthenticated();

  if (!isAuthenticated) {
    statusBar.text = "$(account) Login to Uspark";
    statusBar.command = "uspark.login";
    statusBar.tooltip = "Click to login";
  } else {
    const user = await authManager.getUser();
    if (user) {
      statusBar.text = `$(account) ${user.email}`;
      statusBar.command = undefined;
      statusBar.tooltip = "Logged in as " + user.email;
    } else {
      statusBar.text = "$(sync) Auto Sync";
      statusBar.command = undefined;
      statusBar.tooltip = "Auto sync enabled";
    }
  }
}

export async function activate(context: ExtensionContext) {
  const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  const config = await loadConfig(workspaceRoot);
  if (!config) return;

  console.log(
    `[Uspark] Extension activated for project ${config.projectId} in ${config.configDir}`,
  );

  // Initialize auth manager and API client
  const authManager = new AuthManager(context);
  const api = new ApiClient();

  // Register URI handler
  context.subscriptions.push(window.registerUriHandler(authManager));

  // Create status bar
  const statusBar = window.createStatusBarItem(StatusBarAlignment.Right);
  statusBar.show();

  // Update status bar based on auth state
  await updateStatusBar(statusBar, authManager);

  // Register commands
  context.subscriptions.push(
    commands.registerCommand("uspark.login", async () => {
      await authManager.login();
      await updateStatusBar(statusBar, authManager);
    }),
  );

  context.subscriptions.push(
    commands.registerCommand("uspark.logout", async () => {
      await authManager.logout();
      await updateStatusBar(statusBar, authManager);
    }),
  );

  context.subscriptions.push(
    commands.registerCommand("uspark.syncNow", async () => {
      await sync(
        config.projectId,
        config.configDir,
        statusBar,
        authManager,
        api,
      );
    }),
  );

  // Auto sync function
  const syncFn = () =>
    sync(config.projectId, config.configDir, statusBar, authManager, api);

  // Only start auto-sync if authenticated
  const isAuthenticated = await authManager.isAuthenticated();
  if (isAuthenticated) {
    // 立即同步 + 定时同步
    void syncFn();
    setInterval(syncFn, SYNC_INTERVAL);
  } else {
    console.log(
      "[Uspark] Auto-sync disabled: not authenticated. Please login first.",
    );
  }
}
