import { http, HttpResponse } from "msw";

const API_BASE_URL = "http://localhost:3000";

// Mock handlers for authentication endpoints
export const handlers = [
  // Device code generation
  http.post(`${API_BASE_URL}/api/cli/auth/device`, () => {
    return HttpResponse.json({
      device_code: "TEST-DEVICE-CODE",
      user_code: "WDJB-MJHT",
      verification_url: `${API_BASE_URL}/cli-auth`,
      expires_in: 900, // 15 minutes
      interval: 5,
    });
  }),

  // Token polling - returns pending by default
  http.post(`${API_BASE_URL}/api/cli/auth/token`, () => {
    return HttpResponse.json({
      pending: true,
    });
  }),

  // Token generation for web UI
  http.post(`${API_BASE_URL}/api/cli/auth/generate-token`, () => {
    return HttpResponse.json({
      token: "cli_test_token_12345",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }),
];

// Helper function to mock successful token exchange
export const mockSuccessfulTokenExchange = () => {
  return http.post(`${API_BASE_URL}/api/cli/auth/token`, () => {
    return HttpResponse.json({
      access_token: "test_access_token",
      refresh_token: "test_refresh_token",
      expires_in: 3600,
    });
  });
};

// Helper function to mock expired device code
export const mockExpiredDeviceCode = () => {
  return http.post(`${API_BASE_URL}/api/cli/auth/token`, () => {
    return HttpResponse.json(
      { error: "expired_device_code", message: "The device code has expired" },
      { status: 400 },
    );
  });
};

// Helper function to mock invalid device code
export const mockInvalidDeviceCode = () => {
  return http.post(`${API_BASE_URL}/api/cli/auth/device`, () => {
    return HttpResponse.json(
      { error: "invalid_request", message: "Invalid request parameters" },
      { status: 400 },
    );
  });
};
