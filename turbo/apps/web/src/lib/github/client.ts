import { App } from "@octokit/app";
import { Octokit } from "@octokit/core";
import { initServices } from "../init-services";
import { getInstallationToken } from "./auth";

/**
 * Creates an App-level Octokit client
 * Simple implementation for MVP
 * Internal use only
 */
function createAppOctokit(): App {
  initServices();
  const env = globalThis.services.env;

  // Decode base64 encoded private key
  const privateKey = Buffer.from(env.GH_APP_PRIVATE_KEY, "base64").toString(
    "utf-8",
  );

  return new App({
    appId: env.GH_APP_ID,
    privateKey: privateKey,
  });
}

/**
 * Creates an Installation-level Octokit client
 * Simple implementation without retry logic for MVP
 */
export async function createInstallationOctokit(
  installationId: number,
): Promise<Octokit> {
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
  console.log(
    "getInstallationDetails: starting for installationId:",
    installationId,
  );

  // Use App-level client with JWT token to get installation details
  const app = createAppOctokit();
  console.log("getInstallationDetails: app created");

  console.log(
    "getInstallationDetails: calling GET /app/installations/{installation_id}",
  );
  const { data } = await app.octokit.request(
    "GET /app/installations/{installation_id}",
    {
      installation_id: installationId,
    },
  );
  const accountIdentifier = data.account
    ? "login" in data.account
      ? data.account.login
      : data.account.slug || data.account.name
    : "unknown";
  const accountType = data.account
    ? "type" in data.account
      ? data.account.type
      : "Organization"
    : "unknown";
  console.log(
    "getInstallationDetails: success, account:",
    accountIdentifier,
    "type:",
    accountType,
  );

  return data;
}
