import { App } from "@octokit/app";
import { Octokit } from "@octokit/core";
import { initServices } from "../init-services";
import { getInstallationToken, clearTokenCache } from "./auth";

/**
 * Creates an App-level Octokit client
 * This client is authenticated as the GitHub App itself
 *
 * @returns Octokit instance authenticated as the app
 */
export function createAppOctokit(): App {
  initServices();
  const env = globalThis.services.env;

  return new App({
    appId: env.GH_APP_ID,
    privateKey: env.GH_APP_PRIVATE_KEY,
  });
}

/**
 * Creates an Installation-level Octokit client
 * This client is authenticated for a specific installation
 *
 * @param installationId - The GitHub App installation ID
 * @returns Octokit instance authenticated for the installation
 */
export async function createInstallationOctokit(
  installationId: number,
): Promise<Octokit> {
  const token = await getInstallationToken(installationId);

  const octokit = new Octokit({
    auth: token,
  });

  // Add retry logic for token refresh
  octokit.hook.error("request", async (error: unknown, options: unknown) => {
    // Type guard for error with status
    if (typeof error === "object" && error !== null && "status" in error) {
      const httpError = error as { status: number };
      // If we get a 401, the token might be expired
      if (httpError.status === 401) {
        // Clear the cached token
        clearTokenCache(installationId);

        // Get a fresh token
        const newToken = await getInstallationToken(installationId);

        // Update authorization header and retry
        const requestOptions = options as {
          request: { headers: { authorization: string } };
        };
        requestOptions.request.headers.authorization = `token ${newToken}`;
        // Use the original request parameters for retry
        return octokit.request(
          requestOptions as unknown as Parameters<typeof octokit.request>[0],
        );
      }
    }

    throw error;
  });

  return octokit;
}

/**
 * Gets installation details from GitHub
 *
 * @param installationId - The GitHub App installation ID
 * @returns Installation details including account name and type
 */
export async function getInstallationDetails(installationId: number): Promise<{
  id: number;
  account: {
    login: string;
    type: string;
  };
  repository_selection: string;
  permissions: Record<string, string>;
}> {
  const app = createAppOctokit();
  const octokit = await app.getInstallationOctokit(installationId);

  // Get installation details from GitHub API
  const { data } = await octokit.request("GET /installation", {});

  return data as {
    id: number;
    account: {
      login: string;
      type: string;
    };
    repository_selection: string;
    permissions: Record<string, string>;
  };
}
