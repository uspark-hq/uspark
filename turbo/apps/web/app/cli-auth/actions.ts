"use server";

import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../src/lib/init-services";
import { DEVICE_CODES_TBL } from "../../src/db/schema/device-codes";
import { eq, and, gt } from "drizzle-orm";

export type VerifyDeviceResult =
  | { success: true; message: string }
  | { success: false; error: string; error_description: string };

export async function verifyDeviceAction(
  deviceCode: string,
): Promise<VerifyDeviceResult> {
  // Check if user is authenticated
  const { userId } = await auth();

  if (!userId) {
    return {
      success: false,
      error: "unauthorized",
      error_description: "Authentication required",
    };
  }

  if (!deviceCode || deviceCode.length !== 9) {
    return {
      success: false,
      error: "invalid_request",
      error_description: "Device code must be in format XXXX-XXXX",
    };
  }

  // Initialize services
  initServices();
  const db = globalThis.services.db;

  // Find the device code in database
  const now = new Date();
  const deviceCodes = await db
    .select()
    .from(DEVICE_CODES_TBL)
    .where(
      and(
        eq(DEVICE_CODES_TBL.code, deviceCode),
        gt(DEVICE_CODES_TBL.expiresAt, now),
      ),
    );

  if (deviceCodes.length === 0) {
    return {
      success: false,
      error: "invalid_grant",
      error_description: "Invalid or expired device code",
    };
  }

  const deviceCodeRecord = deviceCodes[0];

  if (!deviceCodeRecord) {
    return {
      success: false,
      error: "invalid_grant",
      error_description: "Device code record not found",
    };
  }

  // Check if already authorized
  if (deviceCodeRecord.userId) {
    return {
      success: false,
      error: "invalid_grant",
      error_description: "Device code has already been used",
    };
  }

  // Associate the device code with the authenticated user
  await db
    .update(DEVICE_CODES_TBL)
    .set({
      userId: userId,
      updatedAt: now,
      status: "authenticated",
    })
    .where(eq(DEVICE_CODES_TBL.code, deviceCodeRecord.code));

  return {
    success: true,
    message: "Device authorized successfully",
  };
}
