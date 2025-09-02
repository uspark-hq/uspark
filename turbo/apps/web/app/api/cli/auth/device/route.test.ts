import { describe, it, expect } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { DeviceAuthResponseSchema } from "@uspark/core";

describe("/api/cli/auth/device", () => {
  it("should return a valid DeviceAuthResponse with correct device_code format", async () => {
    // Create a mock request
    const request = new NextRequest("http://localhost:3000/api/cli/auth/device", {
      method: "POST",
    });

    // Call the API handler
    const response = await POST(request);
    
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
      expect(validData.verification_url).toBe("https://app.uspark.com/cli-auth");
      expect(validData.expires_in).toBe(900); // 15 minutes
      expect(validData.interval).toBe(5); // 5 seconds
    }
  });
});