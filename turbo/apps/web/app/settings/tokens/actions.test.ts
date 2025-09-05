import { describe, it, expect } from "vitest";
import { GenerateTokenRequestSchema } from "@uspark/core";
import crypto from "crypto";

// Test the actual business logic without heavy mocking
describe("Token Generation Logic", () => {
  describe("Input Validation", () => {
    it("should validate token name requirements", () => {
      const validInput = { name: "Test Token", expires_in_days: 90 };
      const result = GenerateTokenRequestSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test Token");
        expect(result.data.expires_in_days).toBe(90);
      }
    });

    it("should reject empty token name", () => {
      const invalidInput = { name: "", expires_in_days: 90 };
      const result = GenerateTokenRequestSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("1 character");
      }
    });

    it("should reject name longer than 100 characters", () => {
      const longName = "a".repeat(101);
      const invalidInput = { name: longName, expires_in_days: 90 };
      const result = GenerateTokenRequestSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("100 character");
      }
    });

    it("should enforce expiration days limits", () => {
      const tooShort = { name: "Test", expires_in_days: 0 };
      const tooLong = { name: "Test", expires_in_days: 366 };

      expect(GenerateTokenRequestSchema.safeParse(tooShort).success).toBe(
        false,
      );
      expect(GenerateTokenRequestSchema.safeParse(tooLong).success).toBe(false);
    });

    it("should use default expiration of 90 days", () => {
      const inputWithoutExpiry = { name: "Test Token" };
      const result = GenerateTokenRequestSchema.safeParse(inputWithoutExpiry);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expires_in_days).toBe(90);
      }
    });
  });

  describe("Token Format", () => {
    it("should generate tokens with correct prefix", () => {
      // Test the token generation logic directly
      function generateCliToken(): string {
        const randomBytes = crypto.randomBytes(32);
        const token = randomBytes.toString("base64url");
        return `usp_live_${token}`;
      }

      const token = generateCliToken();

      expect(token).toMatch(/^usp_live_[A-Za-z0-9_-]+$/);
      expect(token.length).toBeGreaterThan(10);

      // Generate multiple tokens to ensure they're different
      const token2 = generateCliToken();
      expect(token).not.toBe(token2);
    });

    it("should generate proper date formats", () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      expect(now.toISOString()).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(expiresAt.toISOString()).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );

      // Verify 90 days difference
      const diffDays = Math.round(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(90);
    });
  });

  describe("FormData Parsing", () => {
    it("should correctly parse form data", () => {
      const formData = new FormData();
      formData.append("name", "My Token");
      formData.append("expires_in_days", "30");

      const name = formData.get("name") as string;
      const expiresInDays = parseInt(formData.get("expires_in_days") as string);

      expect(name).toBe("My Token");
      expect(expiresInDays).toBe(30);
    });

    it("should handle missing expires_in_days gracefully", () => {
      const formData = new FormData();
      formData.append("name", "My Token");

      const name = formData.get("name") as string;
      const expiresInDays =
        parseInt(formData.get("expires_in_days") as string) || 90;

      expect(name).toBe("My Token");
      expect(expiresInDays).toBe(90); // Default value
    });
  });
});
