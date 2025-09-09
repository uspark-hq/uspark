import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

/**
 * Share token pattern: base64url encoded secure random bytes
 */
const ShareTokenSchema = z
  .string()
  .min(32)
  .describe("Cryptographically secure share token");

/**
 * Create Share Link Request Schema
 */
export const CreateShareRequestSchema = z.object({
  project_id: z.string().min(1).describe("The project ID to share from"),
  file_path: z
    .string()
    .min(1)
    .describe("The file path within the project to share"),
});

/**
 * Create Share Link Response Schema
 */
export const CreateShareResponseSchema = z.object({
  id: z.string().describe("Unique share link ID"),
  url: z.string().url().describe("Full shareable URL"),
  token: ShareTokenSchema.describe("The share token"),
});

/**
 * Create Share Link Error Schema
 */
export const CreateShareErrorSchema = z.object({
  error: z.enum(["unauthorized", "project_not_found", "invalid_request"]),
  error_description: z.string().optional(),
});

/**
 * Access Shared Content Response Schema
 */
export const AccessShareResponseSchema = z.object({
  project_name: z.string().describe("Name of the shared project"),
  file_path: z.string().describe("Path of the shared file"),
  hash: z.string().describe("File content hash for direct blob access"),
  mtime: z.number().describe("File modification time"),
  blob_url: z
    .string()
    .url()
    .optional()
    .describe("Public URL to access the blob content"),
});

/**
 * Access Shared Content Error Schema
 */
export const AccessShareErrorSchema = z.object({
  error: z.enum([
    "share_not_found",
    "file_not_found",
    "blob_storage_not_implemented",
  ]),
  error_description: z.string().optional(),
  message: z.string().optional(),
  file_info: z
    .object({
      project_name: z.string(),
      file_path: z.string(),
      hash: z.string(),
      mtime: z.number(),
    })
    .optional(),
});

/**
 * Share item schema for list response
 */
export const ShareItemSchema = z.object({
  id: z.string().describe("Unique share link ID"),
  token: ShareTokenSchema.describe("The share token"),
  projectId: z.string().describe("Project ID"),
  filePath: z.string().nullable().describe("Shared file path"),
  createdAt: z.date().or(z.string()).describe("Creation timestamp"),
  accessedCount: z.number().describe("Number of times accessed"),
  lastAccessedAt: z
    .date()
    .or(z.string())
    .nullable()
    .describe("Last access timestamp"),
  url: z.string().url().describe("Full shareable URL"),
});

/**
 * List Shares Response Schema
 */
export const ListSharesResponseSchema = z.object({
  shares: z.array(ShareItemSchema).describe("Array of share links"),
});

/**
 * Delete Share Response Schema
 */
export const DeleteShareResponseSchema = z.object({
  success: z.boolean().describe("Whether deletion was successful"),
});

/**
 * Common Share Error Schema
 */
export const ShareErrorSchema = z.object({
  error: z.string().describe("Error code"),
  error_description: z
    .string()
    .optional()
    .describe("Human-readable error description"),
});

// Type exports
export type CreateShareRequest = z.infer<typeof CreateShareRequestSchema>;
export type CreateShareResponse = z.infer<typeof CreateShareResponseSchema>;
export type CreateShareError = z.infer<typeof CreateShareErrorSchema>;
export type AccessShareResponse = z.infer<typeof AccessShareResponseSchema>;
export type AccessShareError = z.infer<typeof AccessShareErrorSchema>;
export type ShareItem = z.infer<typeof ShareItemSchema>;
export type ListSharesResponse = z.infer<typeof ListSharesResponseSchema>;
export type DeleteShareResponse = z.infer<typeof DeleteShareResponseSchema>;
export type ShareError = z.infer<typeof ShareErrorSchema>;

/**
 * Document Sharing API Contract
 */
export const shareContract = c.router({
  /**
   * Create a share link for a single file
   */
  createShare: {
    method: "POST",
    path: "/api/share",
    headers: z.object({
      authorization: z.string().describe("Bearer token"),
    }),
    body: CreateShareRequestSchema,
    responses: {
      201: CreateShareResponseSchema,
      400: CreateShareErrorSchema,
      401: CreateShareErrorSchema,
      404: CreateShareErrorSchema,
    },
    summary: "Create a share link for a single file",
    description:
      "Generate a secure public link to share a specific file from a project. Only single files can be shared, not entire projects.",
  },

  /**
   * Access shared content via token
   */
  accessShare: {
    method: "GET",
    path: "/api/share/:token",
    pathParams: z.object({
      token: ShareTokenSchema,
    }),
    responses: {
      200: AccessShareResponseSchema,
      404: AccessShareErrorSchema,
      501: AccessShareErrorSchema,
    },
    summary: "Access shared file content",
    description:
      "Public endpoint to retrieve the content of a shared file. No authentication required.",
  },

  /**
   * List all share links for the authenticated user
   */
  listShares: {
    method: "GET",
    path: "/api/shares",
    headers: z.object({
      authorization: z.string().describe("Bearer token"),
    }),
    responses: {
      200: ListSharesResponseSchema,
      401: ShareErrorSchema,
    },
    summary: "List user's share links",
    description:
      "Returns a list of all share links created by the authenticated user, ordered by creation date.",
  },

  /**
   * Delete a share link
   */
  deleteShare: {
    method: "DELETE",
    path: "/api/shares/:id",
    pathParams: z.object({
      id: z.string().describe("Share link ID to delete"),
    }),
    headers: z.object({
      authorization: z.string().describe("Bearer token"),
    }),
    responses: {
      200: DeleteShareResponseSchema,
      401: ShareErrorSchema,
      404: ShareErrorSchema,
    },
    summary: "Delete a share link",
    description:
      "Permanently delete a share link. The shared content will no longer be accessible via the share URL.",
  },
});
