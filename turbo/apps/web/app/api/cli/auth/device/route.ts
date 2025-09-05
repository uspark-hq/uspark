import { NextResponse } from "next/server";
import { type DeviceAuthResponse } from "@uspark/core";
import { initServices } from "../../../../../src/lib/init-services";
import { DEVICE_CODES_TBL } from "../../../../../src/db/schema/device-codes";
import crypto from "crypto";

/**
 * Generate a cryptographically secure device code in format XXXX-XXXX
 * Uses uppercase letters and numbers, avoiding confusing characters
 */
function generateDeviceCode(): string {
  // Use characters that are easy to read and type
  // Avoid confusing characters like 0/O, 1/I/L
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const randomBytes = crypto.randomBytes(8);

  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) {
      code += "-";
    }
    // Use modulo to map random byte to character set
    const byte = randomBytes[i];
    if (byte !== undefined) {
      code += chars[byte % chars.length];
    }
  }

  return code;
}

/**
 * POST /api/cli/auth/device
 *
 * Initiates the device authorization flow for CLI authentication.
 * Generates a unique device code that users enter in their browser.
 *
 * @returns DeviceAuthResponse with device_code, user_code, verification_url, etc.
 */
export async function POST() {
  // Initialize services for database access
  initServices();

  // Generate a unique device code
  const deviceCode = generateDeviceCode();
  const expiresIn = 900; // 15 minutes in seconds
  const interval = 5; // 5 seconds polling interval

  // Store device code in database with TTL
  await globalThis.services.db.insert(DEVICE_CODES_TBL).values({
    code: deviceCode,
    status: "pending",
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Prepare the response according to the contract
  const response: DeviceAuthResponse = {
    device_code: deviceCode,
    user_code: deviceCode, // Same as device_code for simplicity
    verification_url: "https://app.uspark.com/cli-auth",
    expires_in: expiresIn,
    interval: interval,
  };

  // TODO: Implement rate limiting

  return NextResponse.json(response);
}
