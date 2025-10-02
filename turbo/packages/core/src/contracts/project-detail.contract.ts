import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

// ============ Common Schemas ============
const SessionSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const GitHubRepositorySchema = z.object({
  fullName: z.string(),
  accountName: z.string(),
  repoName: z.string(),
});

const GitHubInstallationSchema = z.object({
  id: z.string(),
  installationId: z.number(),
  accountName: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ============ Response Schemas ============
const BlobStoreResponseSchema = z.object({
  storeId: z.string(),
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

const GitHubSyncResponseSchema = z.object({
  filesCount: z.number(),
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
        lastBlockId: z.string().nullable(),
      }),
    },
    summary: "Get last block ID",
    description:
      "Returns the ID of the most recent block in the session, or null if no blocks exist.",
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
      installationId: z.number(),
    }),
    responses: {
      200: GitHubRepositoryResponseSchema,
    },
    summary: "Create GitHub repository",
    description: "Creates and links a GitHub repository to a project",
  },

  syncToGitHub: {
    method: "POST",
    path: "/api/projects/:projectId/github/sync",
    pathParams: z.object({
      projectId: z.string(),
    }),
    body: z.object({}), // Empty body for POST request
    responses: {
      200: GitHubSyncResponseSchema,
    },
    summary: "Sync to GitHub",
    description: "Syncs project files to the linked GitHub repository",
  },
});
