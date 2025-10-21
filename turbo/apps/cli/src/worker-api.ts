import os from "os";

interface WorkerMetadata {
  hostname?: string;
  platform?: string;
  cliVersion?: string;
  nodeVersion?: string;
}

interface Worker {
  id: string;
  project_id: string;
  user_id: string;
  name: string | null;
  status: string;
  last_heartbeat_at: string;
  metadata: WorkerMetadata | null;
  created_at: string;
  updated_at: string;
}

/**
 * Worker API client for managing worker registration and heartbeats
 */
export class WorkerApiClient {
  constructor(
    private readonly apiUrl: string,
    private readonly token: string,
  ) {}

  /**
   * Register a new worker for the project
   */
  async registerWorker(
    projectId: string,
    options?: {
      name?: string;
      metadata?: WorkerMetadata;
    },
  ): Promise<Worker> {
    const response = await fetch(
      `${this.apiUrl}/api/projects/${projectId}/workers/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          name: options?.name || os.hostname(),
          metadata: options?.metadata || this.getDefaultMetadata(),
        }),
      },
    );

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error_description?: string;
      };
      throw new Error(
        `Failed to register worker: ${error.error_description || response.statusText}`,
      );
    }

    return (await response.json()) as Worker;
  }

  /**
   * Send heartbeat for a worker
   */
  async sendHeartbeat(projectId: string, workerId: string): Promise<Worker> {
    const response = await fetch(
      `${this.apiUrl}/api/projects/${projectId}/workers/${workerId}/heartbeat`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      },
    );

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error_description?: string;
      };
      throw new Error(
        `Failed to send heartbeat: ${error.error_description || response.statusText}`,
      );
    }

    return (await response.json()) as Worker;
  }

  /**
   * Unregister a worker
   */
  async unregisterWorker(
    projectId: string,
    workerId: string,
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.apiUrl}/api/projects/${projectId}/workers/${workerId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      },
    );

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error_description?: string;
      };
      throw new Error(
        `Failed to unregister worker: ${error.error_description || response.statusText}`,
      );
    }

    return (await response.json()) as { success: boolean };
  }

  /**
   * Get default worker metadata
   */
  private getDefaultMetadata(): WorkerMetadata {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
      // CLI version will be added when we have access to package.json
    };
  }
}
