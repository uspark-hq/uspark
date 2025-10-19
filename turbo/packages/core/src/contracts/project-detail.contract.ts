import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

// ============ Common Schemas ============
const SessionSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const GitHubRepositorySchema = z.object({
  full_name: z.string(),
  account_name: z.string(),
  repo_name: z.string(),
});

const GitHubInstallationSchema = z.object({
  id: z.string(),
  installation_id: z.number(),
  account_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

// ============ Response Schemas ============
const BlobStoreResponseSchema = z.object({
  store_id: z.string(),
});

const ShareResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  token: z.string(),
});

const SessionsResponseSchema = z.object({
  sessions: z.array(SessionSchema),
  total: z.number(),
});

const GitHubRepositoryResponseSchema = z.object({
  repository: GitHubRepositorySchema,
});

const GitHubInstallationsResponseSchema = z.object({
  installations: z.array(GitHubInstallationSchema),
});

// ============ Type Exports ============
export type ProjectSession = z.infer<typeof SessionSchema>;
export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;
export type GitHubInstallation = z.infer<typeof GitHubInstallationSchema>;

// ============ Contract Definition ============
export const projectDetailContract = c.router({
  // Blob Store
  getBlobStore: {
    method: "GET",
    path: "/api/blob-store",
    responses: {
      200: BlobStoreResponseSchema,
    },
    summary: "Get blob store ID",
    description:
      "Returns the Vercel Blob Storage store ID for constructing file URLs",
  },

  // Share
  shareFile: {
    method: "POST",
    path: "/api/share",
    body: z.object({
      project_id: z.string(),
      file_path: z.string(),
    }),
    responses: {
      200: ShareResponseSchema,
    },
    summary: "Create share link",
    description: "Creates a shareable read-only link for a project file",
  },

  // Sessions
  listSessions: {
    method: "GET",
    path: "/api/projects/:projectId/sessions",
    pathParams: z.object({
      projectId: z.string(),
    }),
    query: z.object({
      limit: z.string().optional(),
      offset: z.string().optional(),
    }),
    responses: {
      200: SessionsResponseSchema,
    },
    summary: "List project sessions",
    description:
      "Returns all chat sessions for a project with pagination support",
  },

  createSession: {
    method: "POST",
    path: "/api/projects/:projectId/sessions",
    pathParams: z.object({
      projectId: z.string(),
    }),
    body: z.object({
      title: z.string().optional(),
    }),
    responses: {
      200: SessionSchema,
    },
    summary: "Create new session",
    description: "Creates a new chat session for a project",
  },

  sendMessage: {
    method: "POST",
    path: "/api/projects/:projectId/sessions/:sessionId/turns",
    pathParams: z.object({
      projectId: z.string(),
      sessionId: z.string(),
    }),
    body: z.object({
      user_message: z.string(),
    }),
    responses: {
      200: z.object({
        id: z.string(),
      }),
    },
    summary: "Send message",
    description: "Sends a message to Claude in a session",
  },

  getLastBlockId: {
    method: "GET",
    path: "/api/projects/:projectId/sessions/:sessionId/last-block-id",
    pathParams: z.object({
      projectId: z.string(),
      sessionId: z.string(),
    }),
    responses: {
      200: z.object({
        last_block_id: z.string().nullable(),
      }),
    },
    summary: "Get last block ID",
    description:
      "Returns the ID of the most recent block in the session, or null if no blocks exist.",
  },

  interruptSession: {
    method: "POST",
    path: "/api/projects/:projectId/sessions/:sessionId/interrupt",
    pathParams: z.object({
      projectId: z.string(),
      sessionId: z.string(),
    }),
    body: z.object({}), // Empty body
    responses: {
      200: z.object({
        success: z.boolean(),
      }),
    },
    summary: "Interrupt running session",
    description:
      "Cancels any running turns in the session and stops E2B processes",
  },

  // GitHub Integration
  getGitHubRepository: {
    method: "GET",
    path: "/api/projects/:projectId/github/repository",
    pathParams: z.object({
      projectId: z.string(),
    }),
    responses: {
      200: GitHubRepositoryResponseSchema,
    },
    summary: "Get GitHub repository",
    description: "Returns the linked GitHub repository for a project",
  },

  listGitHubInstallations: {
    method: "GET",
    path: "/api/github/installations",
    responses: {
      200: GitHubInstallationsResponseSchema,
    },
    summary: "List GitHub installations",
    description: "Returns user's GitHub app installations",
  },

  createGitHubRepository: {
    method: "POST",
    path: "/api/projects/:projectId/github/repository",
    pathParams: z.object({
      projectId: z.string(),
    }),
    body: z.object({
      installation_id: z.number(),
    }),
    responses: {
      200: GitHubRepositoryResponseSchema,
    },
    summary: "Create GitHub repository",
    description: "Creates and links a GitHub repository to a project",
  },
});
