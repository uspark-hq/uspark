import { App } from "@octokit/app";
import { Octokit } from "@octokit/core";
import { initServices } from "../init-services";
import { getInstallationToken } from "./auth";

/**
 * Creates an App-level Octokit client
 * Simple implementation for MVP
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
 * Simple implementation without retry logic for MVP
 */
export async function createInstallationOctokit(installationId: number): Promise<Octokit> {
  const token = await getInstallationToken(installationId);

  return new Octokit({
    auth: token,
  });
}

/**
 * Gets installation details from GitHub
 * Simple implementation for MVP
 */
export async function getInstallationDetails(installationId: number) {
  const app = createAppOctokit();
  const octokit = await app.getInstallationOctokit(installationId);
  
  const { data } = await octokit.request("GET /installation");
  return data;
}
