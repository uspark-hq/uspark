import {
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  window,
  workspace,
  commands,
} from "vscode";
import { dirname } from "path";
import { loadConfig } from "./config";
import { AuthManager } from "./auth";
import { ApiClient } from "./api";
import { logger } from "./logger";

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
    logger.info("Sync skipped: not authenticated");
    return;
  }

  logger.info(`Sync triggered for project ${projectId} in ${workDir}`);
  statusBar.text = "$(sync~spin) Syncing...";

  try {
    await api.sync(token, projectId, workDir);
    statusBar.text = "$(check) Synced";
    logger.info("Sync completed successfully");
    // Update status bar immediately after sync - no artificial delay needed
    await updateStatusBar(statusBar, authManager);
  } catch (error) {
    logger.error("Sync failed", error);
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

  // Always show icon only, click to open menu
  statusBar.text = "$(sync)";
  statusBar.command = "uspark.showMenu";

  if (!isAuthenticated) {
    statusBar.tooltip = "uSpark (not logged in) - Click for options";
  } else {
    const user = await authManager.getUser();
    if (user) {
      statusBar.tooltip = `uSpark (${user.email}) - Click for options`;
    } else {
      statusBar.tooltip = "uSpark - Click for options";
    }
  }
}

export async function activate(context: ExtensionContext) {
  // Initialize logger
  logger.init();
  logger.info("Extension activating...");

  let config: Awaited<ReturnType<typeof loadConfig>> = null;

  // First, try to find config in workspace file directory (for multi-root workspaces)
  if (workspace.workspaceFile) {
    const workspaceFilePath = workspace.workspaceFile.fsPath;
    logger.info(`Workspace file: ${workspaceFilePath}`);

    // Get the directory containing the .code-workspace file
    const workspaceDir = dirname(workspaceFilePath);
    logger.info(`Checking workspace directory: ${workspaceDir}`);

    config = await loadConfig(workspaceDir);
    if (config) {
      logger.info(
        `Project configured: ${config.projectId} in ${config.configDir}`,
      );
    }
  }

  // If not found, try all workspace folders
  if (!config) {
    const folders = workspace.workspaceFolders || [];
    logger.info(`Found ${folders.length} workspace folder(s)`);

    for (const folder of folders) {
      const folderPath = folder.uri.fsPath;
      logger.info(`Checking workspace folder: ${folderPath}`);
      config = await loadConfig(folderPath);
      if (config) {
        logger.info(
          `Project configured: ${config.projectId} in ${config.configDir}`,
        );
        break;
      }
    }
  }

  if (!config) {
    logger.info("No project configuration found in workspace");
  }

  // Initialize auth manager and API client
  const authManager = new AuthManager(context);
  const api = new ApiClient();

  // Create status bar (always show it)
  const statusBar = window.createStatusBarItem(StatusBarAlignment.Right);
  statusBar.show();

  // Set callback to update status bar when auth state changes
  authManager.setOnAuthChanged(() => updateStatusBar(statusBar, authManager));

  // Register URI handler
  context.subscriptions.push(window.registerUriHandler(authManager));

  // Update status bar based on auth state
  await updateStatusBar(statusBar, authManager);

  // Register commands (always available)
  context.subscriptions.push(
    commands.registerCommand("uspark.showMenu", async () => {
      const isAuthenticated = await authManager.isAuthenticated();
      const user = await authManager.getUser();

      const items: { label: string; description?: string; action: string }[] =
        [];

      if (isAuthenticated && user) {
        items.push({
          label: "$(account) Logged in",
          description: user.email,
          action: "info",
        });
        items.push({
          label: "$(sync) Sync Now",
          description: "Manually trigger sync",
          action: "sync",
        });
        items.push({
          label: "$(sign-out) Logout",
          description: "Sign out from uSpark",
          action: "logout",
        });
      } else {
        items.push({
          label: "$(sign-in) Login",
          description: "Sign in to uSpark",
          action: "login",
        });
      }

      items.push({
        label: "$(output) Show Logs",
        description: "Open uSpark output panel",
        action: "showLogs",
      });

      const selected = await window.showQuickPick(items, {
        placeHolder: "uSpark Actions",
      });

      if (selected) {
        switch (selected.action) {
          case "login":
            await authManager.login();
            await updateStatusBar(statusBar, authManager);
            break;
          case "logout":
            await authManager.logout();
            await updateStatusBar(statusBar, authManager);
            break;
          case "sync":
            if (!config) {
              void window.showErrorMessage(
                "No uSpark project configured in this workspace. Create a .uspark.json file first.",
              );
            } else {
              await sync(
                config.projectId,
                config.configDir,
                statusBar,
                authManager,
                api,
              );
            }
            break;
          case "showLogs":
            logger.show();
            break;
          case "info":
            // Do nothing, just showing info
            break;
        }
      }
    }),
  );

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
          "No uSpark project configured in this workspace. Create a .uspark.json file first.",
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
      logger.info("Starting auto-sync...");
      void syncFn();
      setInterval(syncFn, SYNC_INTERVAL);
    } else {
      logger.info("Auto-sync disabled: not authenticated. Please login first.");
    }
  } else {
    logger.info("Auto-sync disabled: no project configuration.");
  }

  // Add logger cleanup on deactivation
  context.subscriptions.push({
    dispose: () => logger.dispose(),
  });

  logger.info("Extension activated successfully");
}
