import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

// ============ Common Schemas ============
const WorkerSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  user_id: z.string(),
  status: z.string(),
  last_heartbeat_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============ Response Schemas ============
const WorkersResponseSchema = z.object({
  workers: z.array(WorkerSchema),
});

// ============ Type Exports ============
export type Worker = z.infer<typeof WorkerSchema>;

// ============ Contract Definition ============
export const workersContract = c.router({
  listWorkers: {
    method: "GET",
    path: "/api/projects/:projectId/workers",
    responses: {
      200: WorkersResponseSchema,
    },
    summary: "List workers for a project",
    description:
      "Returns all workers for a project, ordered by most recent heartbeat",
  },
});
