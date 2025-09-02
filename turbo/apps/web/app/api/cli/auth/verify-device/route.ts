import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { initServices } from "../../../../../src/lib/init-services";
import { DEVICE_CODES_TBL } from "../../../../../src/db/schema/device-codes";
import { eq, and, gt } from "drizzle-orm";

export async function POST(request: NextRequest) {
  // Check if user is authenticated
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        error: "unauthorized",
        error_description: "Authentication required",
      },
      { status: 401 },
    );
  }

  // Parse request body
  const body = await request.json();
  const { device_code } = body;

  if (!device_code) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Device code is required",
      },
      { status: 400 },
    );
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
        eq(DEVICE_CODES_TBL.code, device_code),
        gt(DEVICE_CODES_TBL.expiresAt, now),
      ),
    );

  if (deviceCodes.length === 0) {
    return NextResponse.json(
      {
        error: "invalid_grant",
        error_description: "Invalid or expired device code",
      },
      { status: 400 },
    );
  }

  const deviceCodeRecord = deviceCodes[0];
  
  if (!deviceCodeRecord) {
    throw new Error("Device code record not found after validation");
  }

  // Check if already authorized
  if (deviceCodeRecord.userId) {
    return NextResponse.json(
      {
        error: "invalid_grant",
        error_description: "Device code has already been used",
      },
      { status: 400 },
    );
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

  return NextResponse.json(
    {
      success: true,
      message: "Device authorized successfully",
    },
    { status: 200 },
  );
}
