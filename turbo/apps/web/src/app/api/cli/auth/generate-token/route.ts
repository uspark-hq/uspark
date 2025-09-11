import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  type GenerateTokenResponse,
  type GenerateTokenError,
  GenerateTokenRequestSchema,
} from "@uspark/core";
import { initServices } from "@/lib/init-services";
import { CLI_TOKENS_TBL } from "@/db/schema/cli-tokens";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

const MAX_TOKENS_PER_USER = 10;

/**
 * Generate a secure CLI token with prefix
 */
function generateCliToken(): string {
  // Generate 32 bytes of random data and encode as base64url
  const randomBytes = crypto.randomBytes(32);
  const token = randomBytes.toString("base64url");
  // Add a prefix to make it identifiable
  return `usp_live_${token}`;
}

/**
 * POST /api/cli/auth/generate-token
 *
 * Generate a long-lived CLI token for CI/CD or programmatic access.
 * Requires authentication via Clerk JWT.
 *
 * @param request - Contains name and expires_in_days in the body
 * @returns GenerateTokenResponse with token details or error
 */
export async function POST(request: NextRequest) {
  // Check if user is authenticated
  const { userId } = await auth();

  if (!userId) {
    const errorResponse: GenerateTokenError = {
      error: "unauthorized",
      error_description:
        "Authentication required. Please log in to generate a CLI token.",
    };
    return NextResponse.json(errorResponse, { status: 401 });
  }

  // Initialize services for database access
  initServices();

  // Parse and validate the request body
  const body = await request.json();

  const validationResult = GenerateTokenRequestSchema.safeParse(body);

  if (!validationResult.success) {
    const errors = validationResult.error?.issues || [];
    const firstError = errors[0];
    const errorResponse: GenerateTokenError = {
      error: "invalid_request",
      error_description: firstError
        ? `${firstError.path?.join(".") || "field"}: ${firstError.message}`
        : "Invalid request format",
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const { name, expires_in_days = 90 } = validationResult.data;

  // Check current number of active tokens for this user
  const now = new Date();
  const activeTokens = await globalThis.services.db
    .select()
    .from(CLI_TOKENS_TBL)
    .where(
      and(eq(CLI_TOKENS_TBL.userId, userId), gt(CLI_TOKENS_TBL.expiresAt, now)),
    );

  if (activeTokens.length >= MAX_TOKENS_PER_USER) {
    const errorResponse: GenerateTokenError = {
      error: "token_limit_exceeded",
      error_description: `Maximum number of active tokens (${MAX_TOKENS_PER_USER}) reached. Please revoke an existing token before creating a new one.`,
      max_tokens: MAX_TOKENS_PER_USER,
    };
    return NextResponse.json(errorResponse, { status: 403 });
  }

  // Generate new token
  const token = generateCliToken();
  const expiresAt = new Date(
    now.getTime() + expires_in_days * 24 * 60 * 60 * 1000,
  );

  // Store token in database
  await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
    token,
    userId,
    name,
    expiresAt,
    createdAt: now,
  });

  // Prepare the response
  const response: GenerateTokenResponse = {
    token,
    name,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  };

  return NextResponse.json(response, { status: 201 });
}
