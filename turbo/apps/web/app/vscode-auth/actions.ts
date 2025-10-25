"use server";

import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../src/lib/init-services";
import { CLI_TOKENS_TBL } from "../../src/db/schema/cli-tokens";
import { randomBytes } from "crypto";

/**
 * Generate a CLI token for VSCode extension authentication
 */
export async function generateVSCodeToken(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  const { userId } = await auth();

  if (!userId) {
    return {
      success: false,
      error: "Not authenticated",
    };
  }

  try {
    initServices();

    // Generate token
    const token = `usp_live_${randomBytes(32).toString("base64url")}`;

    // Set expiry to 90 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Save token to database
    await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
      token,
      userId,
      name: "VSCode Extension",
      expiresAt,
    });

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error("Failed to generate VSCode token:", error);
    return {
      success: false,
      error: "Failed to generate token",
    };
  }
}
