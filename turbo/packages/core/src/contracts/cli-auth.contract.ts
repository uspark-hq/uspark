import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

/**
 * Device code pattern: XXXX-XXXX (8 characters with dash)
 * Uses uppercase letters and numbers, excluding confusing characters
 */
const DeviceCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  .describe("Device code for CLI authentication");

/**
 * Device authorization request - initiates the device flow
 */
export const DeviceAuthRequestSchema = z
  .object({})
  .describe("Empty body for device authorization request");

/**
 * Device authorization response
 */
export const DeviceAuthResponseSchema = z.object({
  device_code: DeviceCodeSchema.describe(
    "The device verification code to be entered by the user",
  ),
  user_code: DeviceCodeSchema.describe(
    "The user-friendly verification code (same as device_code)",
  ),
  verification_url: z
    .string()
    .url()
    .describe("The URL where the user should enter the device code"),
  expires_in: z
    .number()
    .int()
    .positive()
    .describe("The lifetime in seconds of the device code"),
  interval: z
    .number()
    .int()
    .positive()
    .optional()
    .default(5)
    .describe("The minimum polling interval in seconds"),
});

/**
 * Token exchange request - exchange device code for access token
 */
export const TokenExchangeRequestSchema = z.object({
  device_code: DeviceCodeSchema.describe("The device code to exchange"),
});

/**
 * Token exchange response - successful authentication
 */
export const TokenExchangeSuccessSchema = z.object({
  access_token: z.string().describe("JWT access token for API authentication"),
  refresh_token: z
    .string()
    .optional()
    .describe("Refresh token for obtaining new access tokens"),
  token_type: z
    .literal("Bearer")
    .default("Bearer")
    .describe("The type of token"),
  expires_in: z.number().int().positive().describe("Token lifetime in seconds"),
});

/**
 * Token exchange pending response - user hasn't authenticated yet
 */
export const TokenExchangePendingSchema = z.object({
  error: z.literal("authorization_pending"),
  error_description: z
    .string()
    .default("The user has not yet completed authorization"),
});

/**
 * Token exchange error responses
 */
export const TokenExchangeErrorSchema = z.object({
  error: z.enum([
    "expired_token",
    "invalid_request",
    "access_denied",
    "slow_down",
  ]),
  error_description: z.string(),
});

// Type exports
export type DeviceAuthRequest = z.infer<typeof DeviceAuthRequestSchema>;
export type DeviceAuthResponse = z.infer<typeof DeviceAuthResponseSchema>;
export type TokenExchangeRequest = z.infer<typeof TokenExchangeRequestSchema>;
export type TokenExchangeSuccess = z.infer<typeof TokenExchangeSuccessSchema>;
export type TokenExchangePending = z.infer<typeof TokenExchangePendingSchema>;
export type TokenExchangeError = z.infer<typeof TokenExchangeErrorSchema>;

/**
 * CLI Authentication API Contract
 */
export const cliAuthContract = c.router({
  /**
   * Request device and user codes
   * This endpoint initiates the device authorization flow
   */
  requestDevice: {
    method: "POST",
    path: "/api/cli/auth/device",
    body: DeviceAuthRequestSchema,
    responses: {
      200: DeviceAuthResponseSchema,
      429: z.object({
        error: z.literal("rate_limit_exceeded"),
        error_description: z.string(),
        retry_after: z.number().optional(),
      }),
      500: z.object({
        error: z.string(),
      }),
    },
    summary: "Request device authorization",
    description:
      "Initiates the device authorization flow by generating a unique device code that the user will enter in their browser to authenticate the CLI",
  },

  /**
   * Exchange device code for access token
   * This endpoint should be polled until authentication is complete
   */
  exchangeToken: {
    method: "POST",
    path: "/api/cli/auth/token",
    body: TokenExchangeRequestSchema,
    responses: {
      200: TokenExchangeSuccessSchema,
      202: TokenExchangePendingSchema,
      400: TokenExchangeErrorSchema,
      404: z.object({
        error: z.literal("invalid_grant"),
        error_description: z.string(),
      }),
    },
    summary: "Exchange device code for access token",
    description:
      "Polls for the result of the device authorization. Returns a token when the user has successfully authenticated, or an error if the code has expired or been denied",
  },

  /**
   * Generate long-lived CLI token
   * This endpoint is called from the web UI to generate tokens for CI/CD
   */
  generateToken: {
    method: "POST",
    path: "/api/cli/auth/generate-token",
    headers: z.object({
      authorization: z.string().describe("Bearer token"),
    }),
    body: z.object({
      name: z
        .string()
        .min(1)
        .max(100)
        .describe("A descriptive name for the token"),
      expires_in_days: z
        .number()
        .int()
        .min(1)
        .max(365)
        .default(90)
        .describe("Token lifetime in days"),
    }),
    responses: {
      200: z.object({
        token: z.string().describe("The generated CLI access token"),
        name: z.string().describe("The token name"),
        expires_at: z.string().datetime().describe("Token expiration time"),
        created_at: z.string().datetime().describe("Token creation time"),
      }),
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
      403: z.object({
        error: z.literal("token_limit_exceeded"),
        error_description: z.string(),
        max_tokens: z.number(),
      }),
    },
    summary: "Generate a long-lived CLI token",
    description:
      "Creates a long-lived access token for CLI/CI usage. Requires Bearer token authentication. Users can have a limited number of active tokens",
  },
});
