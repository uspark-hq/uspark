import { NextRequest, NextResponse } from "next/server";
import {
  type TokenExchangeSuccess,
  type TokenExchangePending,
  type TokenExchangeError,
  TokenExchangeRequestSchema,
} from "@uspark/core";
import { initServices } from "../../../../../src/lib/init-services";

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

  try {
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

    // TODO: Check if device code exists in database
    // const deviceSession = await globalThis.services.db
    //   .select()
    //   .from(deviceCodes)
    //   .where(eq(deviceCodes.code, device_code))
    //   .limit(1);

    // For now, simulate different scenarios based on device code pattern
    // This is temporary logic until database is implemented

    // Simulate expired token (codes starting with 'E')
    if (device_code.startsWith("E")) {
      const errorResponse: TokenExchangeError = {
        error: "expired_token",
        error_description:
          "The device code has expired. Please request a new code.",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Simulate access denied (codes starting with 'D')
    if (device_code.startsWith("D")) {
      const errorResponse: TokenExchangeError = {
        error: "access_denied",
        error_description: "The authorization request was denied.",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Simulate successful authentication (codes starting with 'A')
    if (device_code.startsWith("A")) {
      // TODO: Generate real JWT token using Clerk
      // For now, return a mock token
      const successResponse: TokenExchangeSuccess = {
        access_token: `mock_jwt_token_for_${device_code}`,
        refresh_token: `mock_refresh_token_for_${device_code}`,
        token_type: "Bearer",
        expires_in: 3600, // 1 hour
      };

      // TODO: Delete the device code from database after successful exchange
      // await globalThis.services.db
      //   .delete(deviceCodes)
      //   .where(eq(deviceCodes.code, device_code));

      return NextResponse.json(successResponse, { status: 200 });
    }

    // Default: Return pending status (user hasn't authenticated yet)
    const pendingResponse: TokenExchangePending = {
      error: "authorization_pending",
      error_description: "The user has not yet completed authorization",
    };
    return NextResponse.json(pendingResponse, { status: 202 });
  } catch (error) {
    console.error("Token exchange error:", error);
    const errorResponse: TokenExchangeError = {
      error: "invalid_request",
      error_description: "An error occurred processing the request",
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }
}
