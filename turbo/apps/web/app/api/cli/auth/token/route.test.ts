import { describe, it, expect } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import {
  TokenExchangeSuccessSchema,
  TokenExchangePendingSchema,
  TokenExchangeErrorSchema,
} from "@uspark/core";

describe("/api/cli/auth/token", () => {
  it("should return pending status for valid device code not yet authenticated", async () => {
    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      body: JSON.stringify({
        device_code: "WXYZ-1234",
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
    // Device codes starting with 'A' simulate successful authentication
    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      body: JSON.stringify({
        device_code: "ABCD-5678",
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
    // Device codes starting with 'E' simulate expired codes
    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      body: JSON.stringify({
        device_code: "EFGH-9012",
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
    // Device codes starting with 'D' simulate denied authorization
    const request = new NextRequest("http://localhost/api/cli/auth/token", {
      method: "POST",
      body: JSON.stringify({
        device_code: "DXYZ-3456",
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
});
