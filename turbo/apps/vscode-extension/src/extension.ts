import {
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  window,
  workspace,
} from "vscode";
import { loadConfig } from "./config";

const SYNC_INTERVAL = 300000; // 5 分钟

async function sync(
  projectId: string,
  workDir: string,
  statusBar: StatusBarItem,
) {
  console.log(`[Uspark] Sync triggered for project ${projectId} in ${workDir}`);
  statusBar.text = "$(sync~spin) Syncing...";

  // TODO: 实现实际的同步逻辑
  // await syncClient.pullAll(...)
  // await pushAllFiles(...)

  statusBar.text = "$(check) Synced";
  setTimeout(() => (statusBar.text = "$(sync) Auto Sync"), 2000);
}

export async function activate(context: ExtensionContext) {
  const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  const config = await loadConfig(workspaceRoot);
  if (!config) return;

  console.log(
    `[Uspark] Extension activated for project ${config.projectId} in ${config.configDir}`,
  );

  const statusBar = window.createStatusBarItem(StatusBarAlignment.Right);
  statusBar.text = "$(sync) Auto Sync";
  statusBar.show();

  const syncFn = () => sync(config.projectId, config.configDir, statusBar);

  // 立即同步 + 定时同步
  syncFn();
  setInterval(syncFn, SYNC_INTERVAL);
}
