import { describe, it, expect } from "vitest";
import {
  CreateShareRequestSchema,
  CreateShareResponseSchema,
  CreateShareErrorSchema,
  AccessShareResponseSchema,
  AccessShareErrorSchema,
  shareContract,
} from "../share.contract";

describe("Share Contract Schemas", () => {
  describe("CreateShareRequestSchema", () => {
    it("should validate valid request", () => {
      const validRequest = {
        project_id: "test-project-123",
        file_path: "src/index.ts",
      };

      const result = CreateShareRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it("should reject request with missing project_id", () => {
      const invalidRequest = {
        file_path: "src/index.ts",
      };

      const result = CreateShareRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should reject request with missing file_path", () => {
      const invalidRequest = {
        project_id: "test-project-123",
      };

      const result = CreateShareRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should reject request with empty strings", () => {
      const invalidRequest = {
        project_id: "",
        file_path: "",
      };

      const result = CreateShareRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateShareResponseSchema", () => {
    it("should validate valid response", () => {
      const validResponse = {
        id: "share-123",
        url: "https://uspark.dev/share/abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
        token: "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz", // 32+ chars
      };

      const result = CreateShareResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validResponse);
      }
    });

    it("should reject invalid URL", () => {
      const invalidResponse = {
        id: "share-123",
        url: "not-a-url",
        token: "abc123def456ghi789",
      };

      const result = CreateShareResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateShareErrorSchema", () => {
    it("should validate valid error responses", () => {
      const errors = [
        { error: "unauthorized" },
        { error: "project_not_found" },
        { error: "invalid_request", error_description: "Missing field" },
      ];

      errors.forEach((errorResponse) => {
        const result = CreateShareErrorSchema.safeParse(errorResponse);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid error codes", () => {
      const invalidError = {
        error: "unknown_error",
      };

      const result = CreateShareErrorSchema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });
  });

  describe("AccessShareResponseSchema", () => {
    it("should validate valid response", () => {
      const validResponse = {
        project_name: "my-project",
        file_path: "src/index.ts",
        hash: "abc123def456ghi789jkl012mno345pqr678",
        mtime: 1234567890,
      };

      const result = AccessShareResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validResponse);
      }
    });
  });

  describe("AccessShareErrorSchema", () => {
    it("should validate valid error responses", () => {
      const errors = [
        { error: "share_not_found" },
        { error: "file_not_found" },
        {
          error: "blob_storage_not_implemented",
          message: "Blob storage not available",
          file_info: {
            project_name: "test-project",
            file_path: "src/test.ts",
            hash: "abc123",
            mtime: 1234567890,
          },
        },
      ];

      errors.forEach((errorResponse) => {
        const result = AccessShareErrorSchema.safeParse(errorResponse);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid error codes", () => {
      const invalidError = {
        error: "unknown_error",
      };

      const result = AccessShareErrorSchema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });
  });

  describe("shareContract", () => {
    it("should have correct endpoints defined", () => {
      expect(shareContract.createShare).toBeDefined();
      expect(shareContract.accessShare).toBeDefined();
    });

    it("should define createShare endpoint correctly", () => {
      expect(shareContract.createShare.method).toBe("POST");
      expect(shareContract.createShare.path).toBe("/api/share");
      expect(shareContract.createShare.responses[201]).toBeDefined();
      expect(shareContract.createShare.responses[400]).toBeDefined();
      expect(shareContract.createShare.responses[401]).toBeDefined();
      expect(shareContract.createShare.responses[404]).toBeDefined();
    });

    it("should define accessShare endpoint correctly", () => {
      expect(shareContract.accessShare.method).toBe("GET");
      expect(shareContract.accessShare.path).toBe("/api/share/:token");
      expect(shareContract.accessShare.responses[200]).toBeDefined();
      expect(shareContract.accessShare.responses[404]).toBeDefined();
      expect(shareContract.accessShare.responses[501]).toBeDefined();
    });
  });
});
