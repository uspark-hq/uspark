import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import {
  TokenExchangeSuccessSchema,
  TokenExchangePendingSchema,
  TokenExchangeErrorSchema,
} from "@uspark/core";
import {
  createTestDeviceCode,
  cleanupDeviceCodes,
} from "../../../../../src/test/test-helpers";

describe("/api/cli/auth/token", () => {
  beforeEach(async () => {
    await cleanupDeviceCodes();
  });

  afterEach(async () => {
    await cleanupDeviceCodes();
  });

  it("should return pending status for valid device code not yet authenticated", async () => {
    const deviceCode = "WXYZ-1234";
    await createTestDeviceCode({
      code: deviceCode,
      status: "pending",
    });

    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
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
    const deviceCode = "ABCD-5678";
    await createTestDeviceCode({
      code: deviceCode,
      status: "authenticated",
      userId: "test-user-123",
    });

    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
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
      expect(validationResult.data.expires_in).toBe(3600);
      expect(validationResult.data.refresh_token).toBeTruthy();
    }
  });

  it("should return expired error for expired device code", async () => {
    const deviceCode = "EFGH-9012";
    await createTestDeviceCode({
      code: deviceCode,
      status: "expired",
    });

    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      body: JSON.stringify({
        device_code: deviceCode,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    const validationResult = TokenExchangeErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("expired_token");
      expect(validationResult.data.error_description).toContain("expired");
    }
  });

  it("should return access denied error for denied device code", async () => {
    const deviceCode = "DXYZ-3456";
    await createTestDeviceCode({
      code: deviceCode,
      status: "denied",
    });

    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      body: JSON.stringify({
        device_code: deviceCode,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    const validationResult = TokenExchangeErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("access_denied");
      expect(validationResult.data.error_description).toContain("denied");
    }
  });

  it("should return invalid request error for malformed device code", async () => {
    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      body: JSON.stringify({
        device_code: "invalid-code-format",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    const validationResult = TokenExchangeErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("invalid_request");
      expect(validationResult.data.error_description).toContain("Invalid");
    }
  });

  it("should return invalid request error for missing device code", async () => {
    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    const validationResult = TokenExchangeErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("invalid_request");
    }
  });

  it("should return expired error when device code has passed expiration time", async () => {
    const deviceCode = "EXPD-TIME";
    const expiredTime = new Date(Date.now() - 1000 * 60); // 1 minute ago
    await createTestDeviceCode({
      code: deviceCode,
      status: "pending",
      expiresAt: expiredTime,
    });

    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      body: JSON.stringify({
        device_code: deviceCode,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    const validationResult = TokenExchangeErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("expired_token");
      expect(validationResult.data.error_description).toContain("expired");
    }
  });

  it("should return invalid request error for non-existent device code", async () => {
    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      body: JSON.stringify({
        device_code: "NONE-XIST",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    const validationResult = TokenExchangeErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("invalid_request");
      expect(validationResult.data.error_description).toBe(
        "Invalid device code",
      );
    }
  });
});
