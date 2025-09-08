import { describe, it, expect } from "vitest";
import { POST } from "./route";
import { DeviceAuthResponseSchema } from "@uspark/core";
import { DEVICE_CODES_TBL } from "../../../../../src/db/schema/device-codes";
import { eq } from "drizzle-orm";
import { initServices } from "../../../../../src/lib/init-services";

describe("/api/cli/auth/device", () => {
  it("should return a valid DeviceAuthResponse with correct device_code format", async () => {
    // Call the API handler
    const response = await POST();

    // Check response status
    expect(response.status).toBe(200);

    // Parse response body
    const data = await response.json();

    // Validate response matches the contract schema
    const validationResult = DeviceAuthResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      const validData = validationResult.data;

      // Check device_code format (XXXX-XXXX pattern)
      const deviceCodePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
      expect(validData.device_code).toMatch(deviceCodePattern);

      // Check all required fields are present
      expect(validData.user_code).toBe(validData.device_code);
      expect(validData.verification_url).toBe(
        "https://uspark.ai/cli-auth",
      );
      expect(validData.expires_in).toBe(900); // 15 minutes
    }
  });

  it("should store device code in database with correct TTL", async () => {
    // Call the API handler
    const response = await POST();
    expect(response.status).toBe(200);

    const data = await response.json();
    const deviceCode = data.device_code;

    // Verify the device code was stored in database
    initServices();
    const storedCodes = await globalThis.services.db
      .select()
      .from(DEVICE_CODES_TBL)
      .where(eq(DEVICE_CODES_TBL.code, deviceCode));

    const storedCode = storedCodes[0];
    expect(storedCode).toBeDefined();

    if (!storedCode) {
      throw new Error("Device code was not stored in database");
    }

    // Verify all fields are correctly stored
    expect(storedCode.code).toBe(deviceCode);
    expect(storedCode.status).toBe("pending");
    expect(storedCode.userId).toBeNull();

    // Verify TTL is set to 15 minutes from now
    const now = Date.now();
    const expiresAt = storedCode.expiresAt.getTime();
    const diffInMinutes = (expiresAt - now) / 1000 / 60;
    expect(diffInMinutes).toBeGreaterThan(14); // Allow some execution time
    expect(diffInMinutes).toBeLessThanOrEqual(15);
  });

  it("should generate unique device codes on multiple requests", async () => {
    // Generate multiple device codes
    const response1 = await POST();
    const response2 = await POST();
    const response3 = await POST();

    const data1 = await response1.json();
    const data2 = await response2.json();
    const data3 = await response3.json();

    // Verify all codes are unique
    const codes = [data1.device_code, data2.device_code, data3.device_code];
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(3);

    // Verify the specific codes we just created are stored in database
    initServices();
    const storedCodes = await globalThis.services.db
      .select()
      .from(DEVICE_CODES_TBL)
      .where(eq(DEVICE_CODES_TBL.status, "pending"));

    // Check that our codes are among the stored codes
    const storedDeviceCodes = storedCodes.map((c) => c.code);
    expect(storedDeviceCodes).toContain(data1.device_code);
    expect(storedDeviceCodes).toContain(data2.device_code);
    expect(storedDeviceCodes).toContain(data3.device_code);
  });
});
