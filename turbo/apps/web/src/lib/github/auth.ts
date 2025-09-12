import { createAppAuth } from "@octokit/auth-app";
import { initServices } from "../init-services";

/**
 * Token cache to avoid unnecessary API calls
 * Maps installation ID to token data
 */
type TokenData = {
  token: string;
  expiresAt: Date;
};

const tokenCache = new Map<number, TokenData>();

/**
 * Creates an app authentication instance using the GitHub App credentials
 */
function getAppAuth() {
  initServices();
  const env = globalThis.services.env;

  return createAppAuth({
    appId: env.GH_APP_ID,
    privateKey: env.GH_APP_PRIVATE_KEY,
  });
}

/**
 * Gets an installation access token for the given installation ID
 * Implements caching to minimize API calls
 * Tokens are valid for 1 hour, we refresh 5 minutes before expiry
 *
 * @param installationId - The GitHub App installation ID
 * @returns The installation access token
 */
export async function getInstallationToken(
  installationId: number,
): Promise<string> {
  // Check cache first
  const cached = tokenCache.get(installationId);
  if (cached) {
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

    // If token is still valid (with 5 minute buffer), return it
    if (cached.expiresAt.getTime() - now.getTime() > bufferTime) {
      return cached.token;
    }
  }

  // Get new token from GitHub
  const auth = getAppAuth();
  const installationAuthentication = await auth({
    type: "installation",
    installationId,
  });

  // Cache the token
  // GitHub tokens expire after 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  tokenCache.set(installationId, {
    token: installationAuthentication.token,
    expiresAt,
  });

  return installationAuthentication.token;
}

/**
 * Clears the token cache for a specific installation
 * Useful when a token is known to be invalid
 *
 * @param installationId - The GitHub App installation ID
 */
export function clearTokenCache(installationId: number): void {
  tokenCache.delete(installationId);
}

/**
 * Clears the entire token cache
 * Useful for testing or when app credentials change
 */
export function clearAllTokenCache(): void {
  tokenCache.clear();
}
