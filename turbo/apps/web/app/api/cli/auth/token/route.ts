import { NextRequest, NextResponse } from "next/server";
import {
  type TokenExchangeSuccess,
  type TokenExchangePending,
  type TokenExchangeError,
  TokenExchangeRequestSchema,
} from "@uspark/core";
import { initServices } from "../../../../../src/lib/init-services";
import { eq } from "drizzle-orm";
import { deviceCodes } from "../../../../../src/db/schema/device-codes";

/**
 * POST /api/cli/auth/token
 *
 * Exchange a device code for an access token.
 * This endpoint should be polled by the CLI until the user completes authentication.
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
    .from(deviceCodes)
    .where(eq(deviceCodes.code, device_code))
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
      // Generate real JWT token using Clerk
      // For now, return a mock token
      const successResponse: TokenExchangeSuccess = {
        access_token: `jwt_token_for_user_${session.userId}`,
        refresh_token: `refresh_token_for_user_${session.userId}`,
        token_type: "Bearer",
        expires_in: 3600, // 1 hour
      };

      // Delete the device code from database after successful exchange
      await globalThis.services.db
        .delete(deviceCodes)
        .where(eq(deviceCodes.code, device_code));

      return NextResponse.json(successResponse, { status: 200 });
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
