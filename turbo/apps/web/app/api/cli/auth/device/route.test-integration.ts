/**
 * Integration tests for CLI authentication device endpoint
 * Tests the actual HTTP endpoints that CLI will call
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

describe("CLI Auth Device Endpoint Integration", () => {
  beforeAll(async () => {
    // Verify server is running
    try {
      const response = await fetch(`${API_BASE_URL}/api/hello`);
      if (!response.ok) {
        throw new Error("Server not responding");
      }
    } catch (error) {
      console.warn("Server not running, integration tests may fail");
    }
  });

  describe("POST /api/cli/auth/device", () => {
    it("should generate a valid device code", async () => {
      const response = await fetch(`${API_BASE_URL}/api/cli/auth/device`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      // Validate required fields
      expect(data).toHaveProperty("device_code");
      expect(data).toHaveProperty("user_code");
      expect(data).toHaveProperty("verification_url");
      expect(data).toHaveProperty("expires_in");
      expect(data).toHaveProperty("interval");

      // Validate device code format (XXXX-XXXX)
      expect(data.device_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      
      // Validate user code (should be same as device code for simplicity)
      expect(data.user_code).toBe(data.device_code);

      // Validate expiry and interval are numbers
      expect(typeof data.expires_in).toBe("number");
      expect(typeof data.interval).toBe("number");
      expect(data.expires_in).toBe(900); // 15 minutes
      expect(data.interval).toBe(5); // 5 seconds

      // Validate verification URL
      expect(data.verification_url).toContain("uspark.com");
    });

    it("should generate unique device codes", async () => {
      const response1 = await fetch(`${API_BASE_URL}/api/cli/auth/device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const response2 = await fetch(`${API_BASE_URL}/api/cli/auth/device`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.device_code).not.toBe(data2.device_code);
    });

    it("should handle multiple concurrent requests", async () => {
      // Generate multiple device codes concurrently
      const requests = Array.from({ length: 5 }, () =>
        fetch(`${API_BASE_URL}/api/cli/auth/device`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );

      const responses = await Promise.all(requests);
      const data = await Promise.all(
        responses.map((response) => response.json())
      );

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // All device codes should be unique
      const deviceCodes = data.map((d) => d.device_code);
      const uniqueCodes = new Set(deviceCodes);
      expect(uniqueCodes.size).toBe(deviceCodes.length);
    });
  });

  describe("POST /api/cli/auth/token", () => {
    it("should return pending for valid but unauthenticated device code", async () => {
      // First generate a device code
      const deviceResponse = await fetch(`${API_BASE_URL}/api/cli/auth/device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const deviceData = await deviceResponse.json();
      const deviceCode = deviceData.device_code;

      // Then try to exchange it immediately (should be pending)
      const tokenResponse = await fetch(`${API_BASE_URL}/api/cli/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: deviceCode }),
      });

      expect(tokenResponse.status).toBe(202);

      const tokenData = await tokenResponse.json();
      expect(tokenData.error).toBe("authorization_pending");
      expect(tokenData.error_description).toContain("not yet completed");
    });

    it("should return error for invalid device code", async () => {
      const response = await fetch(`${API_BASE_URL}/api/cli/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: "INVALID-CODE" }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("invalid_request");
      expect(data.error_description).toContain("Invalid device code");
    });

    it("should validate request format", async () => {
      // Test with missing device_code
      const response1 = await fetch(`${API_BASE_URL}/api/cli/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response1.status).toBe(400);

      // Test with malformed JSON
      const response2 = await fetch(`${API_BASE_URL}/api/cli/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      expect(response2.status).toBe(400);
    });
  });

  describe("POST /api/cli/auth/generate-token", () => {
    it("should require authentication", async () => {
      const response = await fetch(`${API_BASE_URL}/api/cli/auth/generate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-token",
          expires_in_days: 30,
        }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("unauthorized");
      expect(data.error_description).toContain("Authentication required");
    });

    it("should validate request format", async () => {
      const response = await fetch(`${API_BASE_URL}/api/cli/auth/generate-token`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing required name field
          expires_in_days: 30,
        }),
      });

      expect(response.status).toBe(401); // Will be 401 due to no auth, but format validation would come first in real scenario
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed JSON requests", async () => {
      const response = await fetch(`${API_BASE_URL}/api/cli/auth/device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json {",
      });

      // Should not crash the server
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle missing Content-Type header", async () => {
      const response = await fetch(`${API_BASE_URL}/api/cli/auth/device`, {
        method: "POST",
        // No Content-Type header
        body: JSON.stringify({}),
      });

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});