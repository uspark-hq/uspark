import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { initServices } from "../../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions/:sessionId/interrupt", () => {
  const projectId = `proj_interrupt_${Date.now()}`;
  const sessionId = `sess_interrupt_${Date.now()}`;
  const userId = "test-user-interrupt";
  let createdTurnIds: string[] = [];

  beforeEach(async () => {
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services
    initServices();

    // Clean up any existing test data
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));

    // Create test project
    const ydoc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId,
      ydocData: base64Data,
      version: 0,
    });

    // Create test session
    await globalThis.services.db.insert(SESSIONS_TBL).values({
      id: sessionId,
      projectId,
      title: "Test Session for Interrupt",
    });

    createdTurnIds = [];
  });

  afterEach(async () => {
    // Clean up turns
    for (const turnId of createdTurnIds) {
      await globalThis.services.db
        .delete(TURNS_TBL)
        .where(eq(TURNS_TBL.id, turnId));
    }

    // Clean up session
    await globalThis.services.db
      .delete(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.id, sessionId));

    // Clean up project
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  describe("POST /api/projects/:projectId/sessions/:sessionId/interrupt", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("error", "unauthorized");
    });

    it("should return 404 when project doesn't exist", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
      });
      const context = {
        params: Promise.resolve({
          projectId: "non-existent",
          sessionId,
        }),
      };

      const response = await POST(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "project_not_found");
    });

    it("should return 404 when session doesn't exist", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
      });
      const context = {
        params: Promise.resolve({
          projectId,
          sessionId: "non-existent",
        }),
      };

      const response = await POST(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "session_not_found");
    });

    it("should mark all running turns as failed", async () => {
      // Create multiple turns with different statuses
      const [runningTurn1] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_running1_${Date.now()}`,
          sessionId,
          userPrompt: "Running question 1",
          status: "running",
          startedAt: new Date(),
        })
        .returning();

      const [runningTurn2] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_running2_${Date.now()}`,
          sessionId,
          userPrompt: "Running question 2",
          status: "running",
          startedAt: new Date(),
        })
        .returning();

      const [completedTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_completed_${Date.now()}`,
          sessionId,
          userPrompt: "Completed question",
          status: "completed",
          startedAt: new Date(),
          completedAt: new Date(),
        })
        .returning();

      const [pendingTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_pending_${Date.now()}`,
          sessionId,
          userPrompt: "Pending question",
          status: "pending",
        })
        .returning();

      createdTurnIds.push(
        runningTurn1!.id,
        runningTurn2!.id,
        completedTurn!.id,
        pendingTurn!.id,
      );

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("id", sessionId);
      expect(data).toHaveProperty("status", "interrupted");

      // Verify running turns are now failed
      const [updatedRunning1] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, runningTurn1!.id));

      expect(updatedRunning1!.status).toBe("failed");
      expect(updatedRunning1!.errorMessage).toBe("Session interrupted by user");
      expect(updatedRunning1!.completedAt).not.toBeNull();

      const [updatedRunning2] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, runningTurn2!.id));

      expect(updatedRunning2!.status).toBe("failed");
      expect(updatedRunning2!.errorMessage).toBe("Session interrupted by user");
      expect(updatedRunning2!.completedAt).not.toBeNull();

      // Verify completed turn is unchanged
      const [updatedCompleted] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, completedTurn!.id));

      expect(updatedCompleted!.status).toBe("completed");
      expect(updatedCompleted!.errorMessage).toBeNull();

      // Verify pending turn is unchanged
      const [updatedPending] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, pendingTurn!.id));

      expect(updatedPending!.status).toBe("pending");
      expect(updatedPending!.errorMessage).toBeNull();
      expect(updatedPending!.completedAt).toBeNull();
    });

    it("should update session updatedAt timestamp", async () => {
      // Get original session timestamp
      const [originalSession] = await globalThis.services.db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, sessionId));

      const originalUpdatedAt = originalSession!.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      await POST(request, context);

      // Verify session was updated
      const [updatedSession] = await globalThis.services.db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, sessionId));

      expect(updatedSession!.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });

    it("should handle case when no running turns exist", async () => {
      // Create only completed and pending turns
      const [completedTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_completed_${Date.now()}`,
          sessionId,
          userPrompt: "Completed question",
          status: "completed",
          startedAt: new Date(),
          completedAt: new Date(),
        })
        .returning();

      const [pendingTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_pending_${Date.now()}`,
          sessionId,
          userPrompt: "Pending question",
          status: "pending",
        })
        .returning();

      createdTurnIds.push(completedTurn!.id, pendingTurn!.id);

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("id", sessionId);
      expect(data).toHaveProperty("status", "interrupted");

      // Verify no turns were modified
      const [unchangedCompleted] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, completedTurn!.id));

      expect(unchangedCompleted!.status).toBe("completed");
      expect(unchangedCompleted!.errorMessage).toBeNull();

      const [unchangedPending] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, pendingTurn!.id));

      expect(unchangedPending!.status).toBe("pending");
      expect(unchangedPending!.errorMessage).toBeNull();
    });

    it("should not affect turns from other sessions", async () => {
      // Create running turn in test session
      const [runningTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_running_${Date.now()}`,
          sessionId,
          userPrompt: "Running in test session",
          status: "running",
          startedAt: new Date(),
        })
        .returning();

      createdTurnIds.push(runningTurn!.id);

      // Create another session with running turn
      const otherSessionId = `sess_other_${Date.now()}`;
      await globalThis.services.db.insert(SESSIONS_TBL).values({
        id: otherSessionId,
        projectId,
        title: "Other Session",
      });

      const [otherRunningTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_other_running_${Date.now()}`,
          sessionId: otherSessionId,
          userPrompt: "Running in other session",
          status: "running",
          startedAt: new Date(),
        })
        .returning();

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      await POST(request, context);

      // Verify test session turn was interrupted
      const [updatedTurn] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, runningTurn!.id));

      expect(updatedTurn!.status).toBe("failed");
      expect(updatedTurn!.errorMessage).toBe("Session interrupted by user");

      // Verify other session turn was not affected
      const [otherTurn] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, otherRunningTurn!.id));

      expect(otherTurn!.status).toBe("running");
      expect(otherTurn!.errorMessage).toBeNull();
      expect(otherTurn!.completedAt).toBeNull();

      // Clean up
      await globalThis.services.db
        .delete(TURNS_TBL)
        .where(eq(TURNS_TBL.id, otherRunningTurn!.id));
      await globalThis.services.db
        .delete(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, otherSessionId));
    });
  });
});
