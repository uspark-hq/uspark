import { DocStore } from "@uspark/core";

interface NodeFsDocStoreConfig {
  projectId: string;
  token: string;
  localDir: string;
  baseUrl?: string;
}

export class NodeFsDocStore {
  private docStore: DocStore;
  private localDir: string;

  constructor(config: NodeFsDocStoreConfig) {
    this.docStore = new DocStore({
      projectId: config.projectId,
      token: config.token,
      baseUrl: config.baseUrl,
    });
    this.localDir = config.localDir;
  }

  async sync(signal: AbortSignal): Promise<void> {
    // Minimal implementation: call DocStore's sync
    await this.docStore.sync(signal);
  }
}
