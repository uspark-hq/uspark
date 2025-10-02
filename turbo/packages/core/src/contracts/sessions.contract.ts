import { z } from "zod";
import { initContract } from "@ts-rest/core";

// Session status enum
export const SessionStatusSchema = z.enum(["active", "archived"]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

// Base session schema
export const SessionSchema = z.object({
  id: z.string().startsWith("sess_"),
  projectId: z.string().uuid(),
  title: z.string().nullable(),
  status: SessionStatusSchema.optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});
export type Session = z.infer<typeof SessionSchema>;

// Create session request
export const CreateSessionRequestSchema = z.object({
  title: z.string().optional(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

// Create session response
export const CreateSessionResponseSchema = z.object({
  id: z.string().startsWith("sess_"),
  project_id: z.string().uuid(),
  title: z.string().nullable(),
  created_at: z.date().or(z.string()),
  updated_at: z.date().or(z.string()),
});
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

// List sessions query params
export const ListSessionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});
export type ListSessionsQuery = z.infer<typeof ListSessionsQuerySchema>;

// List sessions response
export const ListSessionsResponseSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string().startsWith("sess_"),
      title: z.string().nullable(),
      created_at: z.date().or(z.string()),
      updated_at: z.date().or(z.string()),
    }),
  ),
  total: z.number(),
});
export type ListSessionsResponse = z.infer<typeof ListSessionsResponseSchema>;

// Get session response
export const GetSessionResponseSchema = z.object({
  id: z.string().startsWith("sess_"),
  project_id: z.string().uuid(),
  title: z.string().nullable(),
  status: SessionStatusSchema.optional(),
  created_at: z.date().or(z.string()),
  updated_at: z.date().or(z.string()),
});
export type GetSessionResponse = z.infer<typeof GetSessionResponseSchema>;

// Delete session response
export const DeleteSessionResponseSchema = z.object({
  success: z.boolean(),
});
export type DeleteSessionResponse = z.infer<typeof DeleteSessionResponseSchema>;

// Interrupt session response
export const InterruptSessionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type InterruptSessionResponse = z.infer<
  typeof InterruptSessionResponseSchema
>;

// Session updates response (for polling)
export const SessionUpdatesResponseSchema = z.object({
  hasUpdates: z.boolean(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type SessionUpdatesResponse = z.infer<
  typeof SessionUpdatesResponseSchema
>;

// Error response
export const SessionErrorResponseSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});
export type SessionErrorResponse = z.infer<typeof SessionErrorResponseSchema>;

// Contract definition
const c = initContract();

export const sessionsContract = c.router({
  createSession: {
    method: "POST",
    path: "/api/projects/:projectId/sessions",
    pathParams: z.object({
      projectId: z.string().uuid(),
    }),
    body: CreateSessionRequestSchema,
    responses: {
      200: CreateSessionResponseSchema,
      401: SessionErrorResponseSchema,
      404: SessionErrorResponseSchema,
      500: SessionErrorResponseSchema,
    },
    summary: "Create a new session",
  },

  listSessions: {
    method: "GET",
    path: "/api/projects/:projectId/sessions",
    pathParams: z.object({
      projectId: z.string().uuid(),
    }),
    query: ListSessionsQuerySchema,
    responses: {
      200: ListSessionsResponseSchema,
      401: SessionErrorResponseSchema,
      404: SessionErrorResponseSchema,
    },
    summary: "List all sessions for a project",
  },

  getSession: {
    method: "GET",
    path: "/api/projects/:projectId/sessions/:sessionId",
    pathParams: z.object({
      projectId: z.string().uuid(),
      sessionId: z.string().startsWith("sess_"),
    }),
    responses: {
      200: GetSessionResponseSchema,
      401: SessionErrorResponseSchema,
      404: SessionErrorResponseSchema,
    },
    summary: "Get a specific session",
  },

  deleteSession: {
    method: "DELETE",
    path: "/api/projects/:projectId/sessions/:sessionId",
    pathParams: z.object({
      projectId: z.string().uuid(),
      sessionId: z.string().startsWith("sess_"),
    }),
    responses: {
      200: DeleteSessionResponseSchema,
      401: SessionErrorResponseSchema,
      404: SessionErrorResponseSchema,
    },
    summary: "Delete a session",
  },

  interruptSession: {
    method: "POST",
    path: "/api/projects/:projectId/sessions/:sessionId/interrupt",
    pathParams: z.object({
      projectId: z.string().uuid(),
      sessionId: z.string().startsWith("sess_"),
    }),
    body: z.object({}), // Empty body for interrupt
    responses: {
      200: InterruptSessionResponseSchema,
      401: SessionErrorResponseSchema,
      404: SessionErrorResponseSchema,
    },
    summary: "Interrupt a running session",
  },

  getLastBlockId: {
    method: "GET",
    path: "/api/projects/:projectId/sessions/:sessionId/last-block-id",
    pathParams: z.object({
      projectId: z.string().uuid(),
      sessionId: z.string().startsWith("sess_"),
    }),
    responses: {
      200: z.object({
        lastBlockId: z.string().nullable(),
      }),
      401: SessionErrorResponseSchema,
      404: SessionErrorResponseSchema,
    },
    summary: "Get last block ID",
  },
});
