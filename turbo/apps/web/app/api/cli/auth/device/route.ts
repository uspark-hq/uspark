import { NextRequest, NextResponse } from "next/server";
import { 
  DeviceAuthResponseSchema, 
  type DeviceAuthResponse 
} from "@uspark/core";
import { z } from "zod";

/**
 * Generate a random device code in format XXXX-XXXX
 * Uses uppercase letters and numbers, avoiding confusing characters
 */
function generateDeviceCode(): string {
  // Use characters that are easy to read and type
  // Avoid confusing characters like 0/O, 1/I/L
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  
  // Generate 8 random characters
  for (let i = 0; i < 8; i++) {
    if (i === 4) {
      code += "-"; // Add dash in the middle
    }
    code += chars[Math.floor(Math.random() * chars.length)];
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
export async function POST(request: NextRequest) {
  try {
    // Generate a unique device code
    const deviceCode = generateDeviceCode();
    
    // Prepare the response according to the contract
    const response: DeviceAuthResponse = {
      device_code: deviceCode,
      user_code: deviceCode, // Same as device_code for simplicity
      verification_url: "https://app.uspark.com/cli-auth",
      expires_in: 900, // 15 minutes in seconds
      interval: 5, // Poll every 5 seconds
    };
    
    // Validate response against schema
    const validatedResponse = DeviceAuthResponseSchema.parse(response);
    
    // TODO: Store device code in database with TTL
    // TODO: Implement rate limiting
    
    return NextResponse.json(validatedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // This shouldn't happen in production, but helps during development
      console.error("Response validation error:", error.issues);
      return NextResponse.json(
        { error: "Internal validation error" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}