import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

// ============ Common Schemas ============
const BlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.record(z.string(), z.unknown()),
  sequenceNumber: z.number(),
});

const TurnSchema = z.object({
  id: z.string(),
  userPrompt: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  errorMessage: z.string().nullable().optional(),
  blocks: z.array(BlockSchema),
});

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

const ProjectSessionUpdateResponseSchema = z.object({
  session: z.object({
    id: z.string(),
    updatedAt: z.string(),
  }),
  turns: z.array(TurnSchema),
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
export type ProjectBlock = z.infer<typeof BlockSchema>;
export type ProjectTurn = z.infer<typeof TurnSchema>;
export type ProjectSession = z.infer<typeof SessionSchema>;
export type ProjectSessionUpdate = z.infer<
  typeof ProjectSessionUpdateResponseSchema
>;
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
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
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
      400: z.object({
        error: z.string(),
      }),
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
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
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
      404: z.object({
        error: z.literal("project_not_found"),
        error_description: z.string(),
      }),
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
      400: z.object({
        error: z.string(),
      }),
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
      404: z.object({
        error: z.literal("project_not_found"),
        error_description: z.string(),
      }),
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
      201: z.object({
        id: z.string(),
      }),
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
      404: z.object({
        error: z.literal("not_found"),
        error_description: z.string(),
      }),
      500: z.object({
        error: z.literal("server_error"),
        error_description: z.string(),
      }),
    },
    summary: "Send message",
    description: "Sends a message to Claude in a session",
  },

  getSessionUpdates: {
    method: "GET",
    path: "/api/projects/:projectId/sessions/:sessionId/updates",
    pathParams: z.object({
      projectId: z.string(),
      sessionId: z.string(),
    }),
    query: z.object({
      state: z.string(),
      timeout: z.string().optional(),
    }),
    responses: {
      200: ProjectSessionUpdateResponseSchema,
      204: z.void(), // No content - no updates
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
      404: z.object({
        error: z.literal("not_found"),
        error_description: z.string(),
      }),
    },
    summary: "Get session updates",
    description: "Long polling endpoint for session updates",
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
      404: z.object({
        error: z.literal("repository_not_linked"),
        error_description: z.string(),
      }),
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
    },
    summary: "Get GitHub repository",
    description: "Returns the linked GitHub repository for a project",
  },

  listGitHubInstallations: {
    method: "GET",
    path: "/api/github/installations",
    responses: {
      200: GitHubInstallationsResponseSchema,
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
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
      201: GitHubRepositoryResponseSchema,
      400: z.object({
        error: z.enum(["repository_already_exists", "github_not_connected"]),
        message: z.string().optional(),
      }),
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
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
      400: z.object({
        error: z.enum(["repository_not_linked", "sync_in_progress"]),
        message: z.string().optional(),
      }),
      401: z.object({
        error: z.literal("unauthorized"),
        error_description: z.string(),
      }),
    },
    summary: "Sync to GitHub",
    description: "Syncs project files to the linked GitHub repository",
  },
});
