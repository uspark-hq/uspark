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
 * Worker API client for sending heartbeats
 */
export class WorkerApiClient {
  constructor(
    private readonly apiUrl: string,
    private readonly token: string,
  ) {}

  /**
   * Send heartbeat (creates or updates worker)
   */
  async sendHeartbeat(
    projectId: string,
    options?: {
      name?: string;
      metadata?: WorkerMetadata;
    },
  ): Promise<Worker> {
    const response = await fetch(
      `${this.apiUrl}/api/projects/${projectId}/workers/heartbeat`,
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
        error.error_description ||
          `Failed to send heartbeat: ${response.statusText}`,
      );
    }

    return (await response.json()) as Worker;
  }

  private getDefaultMetadata(): WorkerMetadata {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
    };
  }
}
