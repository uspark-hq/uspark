import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

/**
 * GitHub Installation Status Schema
 */
export const GitHubInstallationStatusSchema = z.object({
  installationId: z.number().describe("GitHub App installation ID"),
  accountName: z.string().describe("GitHub account name"),
  accountType: z.string().describe("Account type (user or organization)"),
  createdAt: z.string().datetime().describe("Installation creation timestamp"),
  repositorySelection: z.string().describe("Repository selection type"),
});

/**
 * Installation Status Response Schema
 */
export const InstallationStatusResponseSchema = z.object({
  installation: GitHubInstallationStatusSchema.nullable().describe(
    "GitHub installation details, null if not installed",
  ),
});

/**
 * Error Response Schema
 */
export const GitHubErrorSchema = z.object({
  error: z.string().describe("Error message"),
});

// Type exports
export type GitHubInstallationStatus = z.infer<
  typeof GitHubInstallationStatusSchema
>;
export type InstallationStatusResponse = z.infer<
  typeof InstallationStatusResponseSchema
>;
export type GitHubError = z.infer<typeof GitHubErrorSchema>;

/**
 * GitHub API Contract
 */
export const githubContract = c.router({
  /**
   * Get GitHub installation status for the authenticated user
   */
  getInstallationStatus: {
    method: "GET",
    path: "/api/github/installation-status",
    responses: {
      200: InstallationStatusResponseSchema,
      401: z.object({
        error: z.literal("Unauthorized"),
      }),
      500: GitHubErrorSchema,
    },
    summary: "Get GitHub installation status",
    description:
      "Returns the GitHub App installation details for the authenticated user",
  },
});
