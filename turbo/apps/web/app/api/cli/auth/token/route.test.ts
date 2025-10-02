import { describe, it, expect } from "vitest";
import "../../../../../src/test/setup";
import { POST } from "./route";
import { POST as createDevice } from "../device/route";
import { NextRequest } from "next/server";
import {
  TokenExchangeSuccessSchema,
  TokenExchangePendingSchema,
  DeviceAuthResponseSchema,
} from "@uspark/core";
import { updateDeviceCodeStatus } from "../../../../../src/test/db-test-utils";
import { initServices } from "../../../../../src/lib/init-services";
import { DEVICE_CODES_TBL } from "../../../../../src/db/schema/device-codes";
import { eq } from "drizzle-orm";

describe("/api/cli/auth/token", () => {
  async function createDeviceCode(): Promise<string> {
    const response = await createDevice();
    const data = await response.json();
    const validationResult = DeviceAuthResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);
    return validationResult.data!.device_code;
  }

  // Device code manipulation functions are now imported from test utilities

  it("should return pending status for valid device code not yet authenticated", async () => {
    const deviceCode = await createDeviceCode();

    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_code: deviceCode,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(202);

    const data = await response.json();
    const validationResult = TokenExchangePendingSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("authorization_pending");
      expect(validationResult.data.error_description).toBe(
        "The user has not yet completed authorization",
      );
    }
  });

  it("should return success with tokens for authenticated device code", async () => {
    const deviceCode = await createDeviceCode();
    await updateDeviceCodeStatus(deviceCode, "authenticated", "test-user-123");

    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_code: deviceCode,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    const validationResult = TokenExchangeSuccessSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.access_token).toBeTruthy();
      expect(validationResult.data.token_type).toBe("Bearer");
      expect(validationResult.data.expires_in).toBe(90 * 24 * 60 * 60); // 90 days in seconds
      expect(validationResult.data.refresh_token).toBeTruthy();
    }

    // Verify the device code was deleted after successful exchange
    initServices();
    const deletedCode = await globalThis.services.db
      .select()
      .from(DEVICE_CODES_TBL)
      .where(eq(DEVICE_CODES_TBL.code, deviceCode));
    expect(deletedCode.length).toBe(0);
  });
});
