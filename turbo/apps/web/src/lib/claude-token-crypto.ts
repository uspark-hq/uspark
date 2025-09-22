import crypto from "crypto";

/**
 * Utility functions for encrypting and decrypting Claude OAuth tokens
 * Uses AES-256-GCM encryption for security
 */

// Get encryption key from environment or generate a stable one for development
const getEncryptionKey = (): Buffer => {
  const key = process.env.CLAUDE_TOKEN_ENCRYPTION_KEY;

  if (!key) {
    // In development, use a deterministic key based on the environment
    // In production, this MUST be set as an environment variable
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      // Use a stable development key (DO NOT use in production!)
      return crypto.scryptSync("development-key", "stable-salt", 32);
    }
    throw new Error("CLAUDE_TOKEN_ENCRYPTION_KEY environment variable is required in production");
  }

  // Ensure the key is 32 bytes (256 bits) for AES-256
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("CLAUDE_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }

  return keyBuffer;
};

/**
 * Encrypts a Claude OAuth token for secure storage
 * @param token - The plain text Claude OAuth token
 * @returns Encrypted token as base64 string with IV and auth tag
 */
export function encryptClaudeToken(token: string): string {
  const key = getEncryptionKey();

  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  // Encrypt the token
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final()
  ]);

  // Get the authentication tag
  const authTag = cipher.getAuthTag();

  // Combine IV, auth tag, and encrypted data
  // Format: iv(16 bytes) + authTag(16 bytes) + encrypted data
  const combined = Buffer.concat([iv, authTag, encrypted]);

  // Return as base64 string for storage
  return combined.toString("base64");
}

/**
 * Decrypts a Claude OAuth token from storage
 * @param encryptedToken - The encrypted token as base64 string
 * @returns The decrypted plain text OAuth token
 */
export function decryptClaudeToken(encryptedToken: string): string {
  const key = getEncryptionKey();

  // Decode from base64
  const combined = Buffer.from(encryptedToken, "base64");

  // Extract components
  const iv = combined.subarray(0, 16);
  const authTag = combined.subarray(16, 32);
  const encrypted = combined.subarray(32);

  // Create decipher
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the token
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

/**
 * Gets the display prefix of a token (for UI display)
 * @param token - The plain text token
 * @returns The first 10 characters followed by "..."
 */
export function getTokenPrefix(token: string): string {
  if (token.length <= 13) {
    return token;
  }
  return `${token.substring(0, 10)}...`;
}

/**
 * Validates a Claude OAuth token format
 * @param token - The OAuth token to validate
 * @returns True if the token appears to be valid
 */
export function isValidClaudeToken(token: string): boolean {
  if (!token || token.trim().length === 0) {
    return false;
  }

  // OAuth tokens are typically JWT-like or long random strings
  // They should be reasonably long
  if (token.length < 30) {
    return false;
  }

  return true;
}

/**
 * Generates a new encryption key for initial setup
 * This should only be used once during initial deployment
 * @returns A 32-byte key as hex string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}