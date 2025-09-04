"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  type GenerateTokenResponse,
  type GenerateTokenError,
  GenerateTokenRequestSchema,
} from "@uspark/core";
import { initServices } from "../../../src/lib/init-services";
import { CLI_TOKENS_TBL } from "../../../src/db/schema/cli-tokens";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

const MAX_TOKENS_PER_USER = 10;

function generateCliToken(): string {
  const randomBytes = crypto.randomBytes(32);
  const token = randomBytes.toString("base64url");
  return `usp_live_${token}`;
}

export type GenerateTokenResult = 
  | { success: true; data: GenerateTokenResponse }
  | { success: false; error: GenerateTokenError };

export async function generateTokenAction(
  formData: FormData
): Promise<GenerateTokenResult> {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const name = formData.get("name") as string;
  const expiresInDays = parseInt(formData.get("expires_in_days") as string) || 90;

  const validationResult = GenerateTokenRequestSchema.safeParse({
    name,
    expires_in_days: expiresInDays,
  });

  if (!validationResult.success) {
    const errors = validationResult.error?.issues || [];
    const firstError = errors[0];
    return {
      success: false,
      error: {
        error: "invalid_request",
        error_description: firstError
          ? `${firstError.path?.join(".") || "field"}: ${firstError.message}`
          : "Invalid request format",
      },
    };
  }

  const { name: tokenName, expires_in_days } = validationResult.data;

  initServices();

  const now = new Date();
  const activeTokens = await globalThis.services.db
    .select()
    .from(CLI_TOKENS_TBL)
    .where(
      and(eq(CLI_TOKENS_TBL.userId, userId), gt(CLI_TOKENS_TBL.expiresAt, now)),
    );

  if (activeTokens.length >= MAX_TOKENS_PER_USER) {
    return {
      success: false,
      error: {
        error: "token_limit_exceeded",
        error_description: `Maximum number of active tokens (${MAX_TOKENS_PER_USER}) reached. Please revoke an existing token before creating a new one.`,
        max_tokens: MAX_TOKENS_PER_USER,
      },
    };
  }

  const token = generateCliToken();
  const expiresAt = new Date(
    now.getTime() + expires_in_days * 24 * 60 * 60 * 1000,
  );

  await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
    token,
    userId,
    name: tokenName,
    expiresAt,
    createdAt: now,
  });

  return {
    success: true,
    data: {
      token,
      name: tokenName,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
    },
  };
}