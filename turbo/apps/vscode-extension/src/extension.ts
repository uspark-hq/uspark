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
    void window.showErrorMessage(
      `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
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
  console.log("[Uspark] Extension activating...");

  const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
  const config = workspaceRoot ? await loadConfig(workspaceRoot) : null;

  if (config) {
    console.log(
      `[Uspark] Project configured: ${config.projectId} in ${config.configDir}`,
    );
  } else {
    console.log("[Uspark] No project configuration found");
  }

  // Initialize auth manager and API client
  const authManager = new AuthManager(context);
  const api = new ApiClient();

  // Register URI handler
  context.subscriptions.push(window.registerUriHandler(authManager));

  // Create status bar (always show it)
  const statusBar = window.createStatusBarItem(StatusBarAlignment.Right);
  statusBar.show();

  // Update status bar based on auth state
  await updateStatusBar(statusBar, authManager);

  // Register commands (always available)
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
      if (!config) {
        void window.showErrorMessage(
          "No Uspark project configured in this workspace. Create a .uspark.json file first.",
        );
        return;
      }
      await sync(
        config.projectId,
        config.configDir,
        statusBar,
        authManager,
        api,
      );
    }),
  );

  // Only start auto-sync if we have a config and user is authenticated
  if (config) {
    const syncFn = () =>
      sync(config.projectId, config.configDir, statusBar, authManager, api);

    const isAuthenticated = await authManager.isAuthenticated();
    if (isAuthenticated) {
      console.log("[Uspark] Starting auto-sync...");
      void syncFn();
      setInterval(syncFn, SYNC_INTERVAL);
    } else {
      console.log(
        "[Uspark] Auto-sync disabled: not authenticated. Please login first.",
      );
    }
  } else {
    console.log("[Uspark] Auto-sync disabled: no project configuration.");
  }

  console.log("[Uspark] Extension activated successfully");
}
