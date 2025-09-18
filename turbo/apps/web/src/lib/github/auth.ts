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

  // Decode base64 encoded private key
  const privateKey = Buffer.from(env.GH_APP_PRIVATE_KEY, "base64").toString(
    "utf-8",
  );

  const auth = createAppAuth({
    appId: env.GH_APP_ID,
    privateKey: privateKey,
  });

  try {
    const installationAuthentication = await auth({
      type: "installation",
      installationId,
    });

    console.log("Installation token obtained for:", {
      installationId,
      tokenPrefix: installationAuthentication.token.substring(0, 10) + "...",
      expiresAt: installationAuthentication.expiresAt,
    });

    return installationAuthentication.token;
  } catch (error) {
    console.error("Failed to get installation token:", error);
    throw error;
  }
}
