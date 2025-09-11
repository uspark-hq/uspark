import { env } from "@/env";

/**
 * Encrypts a string using AES-GCM encryption
 */
export async function encryptString(text: string): Promise<string> {
  const environment = env();
  const key = environment.ENCRYPTION_KEY;
  
  if (!key || key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 characters");
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypts a string that was encrypted using encryptString
 */
export async function decryptString(encryptedText: string): Promise<string> {
  const environment = env();
  const key = environment.ENCRYPTION_KEY;
  
  if (!key || key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 characters");
  }
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const combined = Buffer.from(encryptedText, "base64");
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

/**
 * Generates a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Verifies a GitHub webhook signature
 */
export async function verifyGitHubWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const signatureBuffer = Buffer.from(signature.replace("sha256=", ""), "hex");
    
    return await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      signatureBuffer,
      data
    );
  } catch {
    return false;
  }
}