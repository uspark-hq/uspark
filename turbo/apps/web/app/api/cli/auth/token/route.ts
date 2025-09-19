import { NextRequest, NextResponse } from "next/server";
import {
  type TokenExchangeSuccess,
  type TokenExchangePending,
  type TokenExchangeError,
  TokenExchangeRequestSchema,
} from "@uspark/core";
import { initServices } from "../../../../../src/lib/init-services";
import { eq, and, gt } from "drizzle-orm";
import { DEVICE_CODES_TBL } from "../../../../../src/db/schema/device-codes";
import { CLI_TOKENS_TBL } from "../../../../../src/db/schema/cli-tokens";
import crypto from "crypto";

/**
 * POST /api/cli/auth/token
 *
 * Exchange a device code for an access token after the user has authenticated.
 *
 * @param request - Contains device_code in the body
 * @returns TokenExchangeSuccess if authenticated, TokenExchangePending if waiting, or error
 */
export async function POST(request: NextRequest) {
  // Initialize services for database access
  initServices();

  // Parse and validate the request body
  const body = await request.json();
  const validationResult = TokenExchangeRequestSchema.safeParse(body);

  if (!validationResult.success) {
    const errorResponse: TokenExchangeError = {
      error: "invalid_request",
      error_description: "Invalid device code format",
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const { device_code } = validationResult.data;

  // Check if device code exists in database
  const deviceSession = await globalThis.services.db
    .select()
    .from(DEVICE_CODES_TBL)
    .where(eq(DEVICE_CODES_TBL.code, device_code))
    .limit(1);

  const session = deviceSession[0];

  if (!session) {
    const errorResponse: TokenExchangeError = {
      error: "invalid_request",
      error_description: "Invalid device code",
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  // Check if the device code has expired
  if (new Date() > session.expiresAt) {
    const errorResponse: TokenExchangeError = {
      error: "expired_token",
      error_description:
        "The device code has expired. Please request a new code.",
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  // Handle different statuses
  switch (session.status) {
    case "expired": {
      const expiredResponse: TokenExchangeError = {
        error: "expired_token",
        error_description:
          "The device code has expired. Please request a new code.",
      };
      return NextResponse.json(expiredResponse, { status: 400 });
    }

    case "denied": {
      const deniedResponse: TokenExchangeError = {
        error: "access_denied",
        error_description: "The authorization request was denied.",
      };
      return NextResponse.json(deniedResponse, { status: 400 });
    }

    case "authenticated": {
      // Generate a CLI token for long-term authentication
      try {
        // Generate a secure CLI token with prefix
        const randomBytes = crypto.randomBytes(32);
        const tokenValue = randomBytes.toString("base64url");
        const cliToken = `usp_live_${tokenValue}`;

        // Set expiration to 90 days by default
        const expiresInDays = 90;
        const now = new Date();
        const expiresAt = new Date(
          now.getTime() + expiresInDays * 24 * 60 * 60 * 1000,
        );

        // Check if user already has too many tokens
        const MAX_TOKENS_PER_USER = 10;
        const activeTokens = await globalThis.services.db
          .select()
          .from(CLI_TOKENS_TBL)
          .where(
            and(
              eq(CLI_TOKENS_TBL.userId, session.userId!),
              gt(CLI_TOKENS_TBL.expiresAt, now),
            ),
          );

        if (activeTokens.length >= MAX_TOKENS_PER_USER) {
          // Clean up the oldest token to make room
          const oldestToken = activeTokens.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          )[0];
          if (oldestToken) {
            await globalThis.services.db
              .delete(CLI_TOKENS_TBL)
              .where(eq(CLI_TOKENS_TBL.id, oldestToken.id));
          }
        }

        // Store the CLI token in database
        await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
          token: cliToken,
          userId: session.userId!,
          name: "CLI Device Flow Authentication",
          expiresAt,
          createdAt: now,
        });

        const successResponse: TokenExchangeSuccess = {
          access_token: cliToken,
          refresh_token: `refresh_${crypto.randomBytes(16).toString("hex")}`, // Generate a refresh token for future use
          token_type: "Bearer",
          expires_in: expiresInDays * 24 * 60 * 60, // Convert days to seconds
        };

        // Delete the device code from database after successful exchange
        await globalThis.services.db
          .delete(DEVICE_CODES_TBL)
          .where(eq(DEVICE_CODES_TBL.code, device_code));

        return NextResponse.json(successResponse, { status: 200 });
      } catch (error) {
        console.error("Failed to create CLI token:", error);
        const errorResponse: TokenExchangeError = {
          error: "server_error",
          error_description: "Failed to generate authentication token.",
        };
        return NextResponse.json(errorResponse, { status: 500 });
      }
    }

    case "pending":
    default: {
      // Return pending status (user hasn't authenticated yet)
      const pendingResponse: TokenExchangePending = {
        error: "authorization_pending",
        error_description: "The user has not yet completed authorization",
      };
      return NextResponse.json(pendingResponse, { status: 202 });
    }
  }
}
