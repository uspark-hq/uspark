import { createAppAuth } from "@octokit/auth-app";
import { initServices } from "../init-services";

/**
 * Gets an installation access token for the given installation ID
 * Simple implementation without caching for MVP
 */
export async function getInstallationToken(
  installationId: number,
): Promise<string> {
  initServices();
  const env = globalThis.services.env;

  const auth = createAppAuth({
    appId: env.GH_APP_ID,
    privateKey: env.GH_APP_PRIVATE_KEY,
  });

  const installationAuthentication = await auth({
    type: "installation",
    installationId,
  });

  return installationAuthentication.token;
}
