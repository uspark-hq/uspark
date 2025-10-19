import { z } from "zod";
import { initContract } from "@ts-rest/core";

// Turn status enum
export const TurnStatusSchema = z.enum([
  "running", // Replaces both "pending" and "in_progress"
  "completed",
  "failed",
  "interrupted",
  "cancelled", // Set when a new turn is created, cancelling the previous one
]);
export type TurnStatus = z.infer<typeof TurnStatusSchema>;

// Base turn schema
export const TurnSchema = z.object({
  id: z.string().startsWith("turn_"),
  sessionId: z.string().startsWith("sess_"),
  userPrompt: z.string(),
  status: TurnStatusSchema,
  completedAt: z.date().or(z.string()).nullable(),
  createdAt: z.date().or(z.string()),
});
export type Turn = z.infer<typeof TurnSchema>;

// Block schema (for turn content)
export const BlockSchema = z.object({
  id: z.string().startsWith("block_"),
  turnId: z.string().startsWith("turn_"),
  type: z.enum(["text", "code", "tool_use", "tool_result", "error"]),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date().or(z.string()),
});
export type Block = z.infer<typeof BlockSchema>;

// Create turn request
export const CreateTurnRequestSchema = z.object({
  user_message: z.string().min(1),
});
export type CreateTurnRequest = z.infer<typeof CreateTurnRequestSchema>;

// Create turn response
export const CreateTurnResponseSchema = z.object({
  id: z.string().startsWith("turn_"),
  session_id: z.string().startsWith("sess_"),
  user_message: z.string(),
  status: TurnStatusSchema,
  created_at: z.date().or(z.string()),
});
export type CreateTurnResponse = z.infer<typeof CreateTurnResponseSchema>;

// List turns query params
export const ListTurnsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});
export type ListTurnsQuery = z.infer<typeof ListTurnsQuerySchema>;

// Turn with blocks
export const TurnWithBlocksSchema = z.object({
  id: z.string().startsWith("turn_"),
  user_prompt: z.string(),
  status: TurnStatusSchema,
  completed_at: z.date().or(z.string()).nullable(),
  created_at: z.date().or(z.string()),
  block_count: z.number(),
  block_ids: z.array(z.string()),
});
export type TurnWithBlocks = z.infer<typeof TurnWithBlocksSchema>;

// List turns response
export const ListTurnsResponseSchema = z.object({
  turns: z.array(TurnWithBlocksSchema),
  total: z.number(),
});
export type ListTurnsResponse = z.infer<typeof ListTurnsResponseSchema>;

// Get turn response
export const GetTurnResponseSchema = z.object({
  id: z.string().startsWith("turn_"),
  session_id: z.string().startsWith("sess_"),
  user_prompt: z.string(),
  status: TurnStatusSchema,
  completed_at: z.date().or(z.string()).nullable(),
  created_at: z.date().or(z.string()),
  blocks: z.array(BlockSchema),
});
export type GetTurnResponse = z.infer<typeof GetTurnResponseSchema>;

// Delete turn response
export const DeleteTurnResponseSchema = z.object({
  success: z.boolean(),
});
export type DeleteTurnResponse = z.infer<typeof DeleteTurnResponseSchema>;

// On Claude stdout request (from watch-claude)
export const OnClaudeStdoutRequestSchema = z.object({
  line: z.string(), // Single line of JSON from Claude stdout
});
export type OnClaudeStdoutRequest = z.infer<typeof OnClaudeStdoutRequestSchema>;

// On Claude stdout response
export const OnClaudeStdoutResponseSchema = z.object({
  ok: z.boolean(),
});
export type OnClaudeStdoutResponse = z.infer<
  typeof OnClaudeStdoutResponseSchema
>;

// Error response
export const TurnErrorResponseSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});
export type TurnErrorResponse = z.infer<typeof TurnErrorResponseSchema>;

// Contract definition
const c = initContract();

export const turnsContract = c.router({
  createTurn: {
    method: "POST",
    path: "/api/projects/:projectId/sessions/:sessionId/turns",
    pathParams: z.object({
      projectId: z.string().uuid(),
      sessionId: z.string().startsWith("sess_"),
    }),
    body: CreateTurnRequestSchema,
    responses: {
      200: CreateTurnResponseSchema,
      400: TurnErrorResponseSchema,
      401: TurnErrorResponseSchema,
      404: TurnErrorResponseSchema,
      500: TurnErrorResponseSchema,
    },
    summary: "Create a new turn in a session",
  },

  listTurns: {
    method: "GET",
    path: "/api/projects/:projectId/sessions/:sessionId/turns",
    pathParams: z.object({
      projectId: z.string().uuid(),
      sessionId: z.string().startsWith("sess_"),
    }),
    query: ListTurnsQuerySchema,
    responses: {
      200: ListTurnsResponseSchema,
      401: TurnErrorResponseSchema,
      404: TurnErrorResponseSchema,
    },
    summary: "List all turns in a session",
  },

  getTurn: {
    method: "GET",
    path: "/api/projects/:projectId/sessions/:sessionId/turns/:turnId",
    pathParams: z.object({
      projectId: z.string().uuid(),
      sessionId: z.string().startsWith("sess_"),
      turnId: z.string().startsWith("turn_"),
    }),
    responses: {
      200: GetTurnResponseSchema,
      401: TurnErrorResponseSchema,
      404: TurnErrorResponseSchema,
    },
    summary: "Get a specific turn with its blocks",
  },

  deleteTurn: {
    method: "DELETE",
    path: "/api/projects/:projectId/sessions/:sessionId/turns/:turnId",
    pathParams: z.object({
      projectId: z.string().uuid(),
      sessionId: z.string().startsWith("sess_"),
      turnId: z.string().startsWith("turn_"),
    }),
    responses: {
      200: DeleteTurnResponseSchema,
      401: TurnErrorResponseSchema,
      404: TurnErrorResponseSchema,
    },
    summary: "Delete a turn",
  },

  onClaudeStdout: {
    method: "POST",
    path: "/api/projects/:projectId/sessions/:sessionId/turns/:turnId/on-claude-stdout",
    pathParams: z.object({
      projectId: z.string().uuid(),
      sessionId: z.string().startsWith("sess_"),
      turnId: z.string().startsWith("turn_"),
    }),
    body: OnClaudeStdoutRequestSchema,
    responses: {
      200: OnClaudeStdoutResponseSchema,
      401: TurnErrorResponseSchema,
      404: TurnErrorResponseSchema,
      409: TurnErrorResponseSchema, // Turn already completed/cancelled
      500: TurnErrorResponseSchema,
    },
    summary: "Receive Claude stdout from watch-claude (CLI token auth)",
  },
});
