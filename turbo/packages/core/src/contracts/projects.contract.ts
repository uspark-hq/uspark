import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

/**
 * Project Schema - represents a project in the system
 */
export const ProjectSchema = z.object({
  id: z.string().describe("Unique project identifier"),
  name: z.string().describe("Project name (using ID for now)"),
  created_at: z.string().datetime().describe("Project creation timestamp"),
  updated_at: z.string().datetime().describe("Project last update timestamp"),
  source_repo_url: z
    .string()
    .optional()
    .describe("GitHub repository URL in 'owner/repo' format"),
});

/**
 * Create Project Request Schema
 */
export const CreateProjectRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be under 100 characters")
    .describe("Name for the new project"),
  sourceRepoUrl: z
    .string()
    .optional()
    .describe("GitHub repository URL in 'owner/repo' format for initial scan"),
  installationId: z
    .number()
    .optional()
    .describe("GitHub App installation ID for repository access"),
});

/**
 * Create Project Response Schema
 */
export const CreateProjectResponseSchema = z.object({
  id: z.string().describe("Generated project identifier"),
  name: z.string().describe("Project name"),
  created_at: z.string().datetime().describe("Project creation timestamp"),
});

/**
 * List Projects Response Schema
 */
export const ListProjectsResponseSchema = z.object({
  projects: z.array(ProjectSchema).describe("Array of user's projects"),
});

/**
 * Error Response Schema
 */
export const ProjectErrorSchema = z.object({
  error: z.string().describe("Error message"),
});

// Type exports
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;
export type ListProjectsResponse = z.infer<typeof ListProjectsResponseSchema>;
export type ProjectError = z.infer<typeof ProjectErrorSchema>;

/**
 * Projects API Contract
 */
/**
 * Blob Token Response Schema
 */
export const BlobTokenResponseSchema = z.object({
  token: z.string().describe("Client token for blob storage access"),
  expiresAt: z.string().datetime().describe("Token expiration time"),
  uploadUrl: z.string().url().describe("URL for uploading blobs"),
  downloadUrlPrefix: z
    .string()
    .url()
    .describe("URL prefix for downloading blobs"),
});

/**
 * Blob Token Error Schema
 */
export const BlobTokenErrorSchema = z.object({
  error: z.string().describe("Error code"),
  error_description: z.string().describe("Human-readable error description"),
});

// Type exports for blob token
export type BlobTokenResponse = z.infer<typeof BlobTokenResponseSchema>;
export type BlobTokenError = z.infer<typeof BlobTokenErrorSchema>;

export const projectsContract = c.router({
  /**
   * List all projects for the authenticated user
   */
  listProjects: {
    method: "GET",
    path: "/api/projects",
    responses: {
      200: ListProjectsResponseSchema,
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
      500: ProjectErrorSchema,
    },
    summary: "List user's projects",
    description:
      "Returns a list of all projects belonging to the authenticated user",
  },

  /**
   * Create a new project
   */
  createProject: {
    method: "POST",
    path: "/api/projects",
    body: CreateProjectRequestSchema,
    responses: {
      201: CreateProjectResponseSchema,
      400: z.object({
        error: z.string(),
        error_description: z.string().optional(),
      }),
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
      500: ProjectErrorSchema,
    },
    summary: "Create a new project",
    description: "Creates a new project with an empty YJS document structure",
  },

  /**
   * Get project YJS snapshot (existing endpoint)
   * Returns the complete YJS document state as binary data
   */
  getProjectSnapshot: {
    method: "GET",
    path: "/api/projects/:projectId",
    pathParams: z.object({
      projectId: z.string().describe("Project identifier"),
    }),
    responses: {
      200: z.any().describe("Binary YJS document data"), // Binary response
      404: z.object({
        error: z.literal("project_not_found"),
        error_description: z.string(),
      }),
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
    },
    summary: "Get project YJS snapshot",
    description:
      "Returns the complete YJS document state as binary data for client-side file structure parsing",
  },

  /**
   * Update project YJS state (existing endpoint)
   * Applies incremental YJS updates to the stored document
   */
  updateProjectState: {
    method: "PATCH",
    path: "/api/projects/:projectId",
    pathParams: z.object({
      projectId: z.string().describe("Project identifier"),
    }),
    body: z.any().describe("Binary YJS update data"), // Binary request body
    headers: z.object({
      "x-version": z
        .string()
        .optional()
        .describe("Client version for optimistic locking"),
    }),
    responses: {
      200: z.object({
        message: z.literal("OK"),
      }),
      404: z.object({
        error: z.literal("project_not_found"),
        error_description: z.string(),
      }),
      409: z.object({
        error: z.enum(["version_conflict", "concurrent_update_conflict"]),
        error_description: z.string(),
        currentVersion: z.number().optional(),
      }),
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
    },
    summary: "Update project YJS state",
    description:
      "Applies incremental YJS updates to the stored document with optimistic locking",
  },

  /**
   * Get blob storage token for project
   * Returns a temporary client token for direct blob storage access
   */
  getBlobToken: {
    method: "GET",
    path: "/api/projects/:projectId/blob-token",
    pathParams: z.object({
      projectId: z.string().describe("Project identifier"),
    }),
    responses: {
      200: BlobTokenResponseSchema,
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string().optional(),
      }),
      404: z.object({
        error: z.literal("project_not_found"),
        error_description: z.string(),
      }),
      500: BlobTokenErrorSchema,
    },
    summary: "Get blob storage token",
    description:
      "Returns a temporary client token for direct Vercel Blob Storage access with project-scoped permissions",
  },
});
