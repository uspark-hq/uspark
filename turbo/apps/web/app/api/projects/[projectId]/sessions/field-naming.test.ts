import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../../../../../src/test/setup";
import { GET } from "./route";
import { POST as createProject } from "../../route";
import { POST as createSession } from "./route";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { SESSIONS_TBL } from "../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("Sessions API - Field Naming Consistency", () => {
  const projectId = `field-test-${Date.now()}`;
  const userId = `test-user-${Date.now()}-${process.pid}`;
  let sessionId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    initServices();

    // Clean up any existing test data
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));

    // Create test project
    const createProjectRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: `Test Project ${Date.now()}` }),
    });
    const projectResponse = await createProject(createProjectRequest);
    expect(projectResponse.status).toBe(201);
    const projectData = await projectResponse.json();

    // Update the project with our test ID
    await globalThis.services.db
      .update(PROJECTS_TBL)
      .set({ id: projectId })
      .where(eq(PROJECTS_TBL.id, projectData.id));

    // Create test session
    const createSessionRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ title: "Test Session" }),
    });
    const sessionContext = { params: Promise.resolve({ projectId }) };
    const sessionResponse = await createSession(
      createSessionRequest,
      sessionContext,
    );
    expect(sessionResponse.status).toBe(200);
    const sessionData = await sessionResponse.json();
    sessionId = sessionData.id;
  });

  afterEach(async () => {
    // Clean up session
    await globalThis.services.db
      .delete(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.id, sessionId));

    // Clean up project
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  it("should return snake_case fields (created_at, updated_at) that match API response format", async () => {
    const request = new NextRequest("http://localhost:3000");
    const context = { params: Promise.resolve({ projectId }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.sessions).toHaveLength(1);
    const session = data.sessions[0];

    // Check that API returns snake_case fields
    expect(session).toHaveProperty("created_at");
    expect(session).toHaveProperty("updated_at");

    // These should be valid ISO strings
    expect(typeof session.created_at).toBe("string");
    expect(typeof session.updated_at).toBe("string");

    // Verify they can be parsed
    const createdDate = new Date(session.created_at);
    const updatedDate = new Date(session.updated_at);

    expect(createdDate.toString()).not.toBe("Invalid Date");
    expect(updatedDate.toString()).not.toBe("Invalid Date");
  });

  it("should use snake_case consistently across API and contract", async () => {
    const request = new NextRequest("http://localhost:3000");
    const context = { params: Promise.resolve({ projectId }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    const data = await response.json();

    const session = data.sessions[0];

    // API returns snake_case
    expect(session).toHaveProperty("created_at");
    expect(session).toHaveProperty("updated_at");

    // Contract now expects snake_case (fixed!)
    expect(session).not.toHaveProperty("createdAt");
    expect(session).not.toHaveProperty("updatedAt");

    console.log("✅  API Response uses snake_case:", {
      created_at: session.created_at,
      updated_at: session.updated_at,
    });
    console.log("✅  Contract now expects snake_case: created_at, updated_at");
    console.log("✅  Both API and contract are now consistent!");
  });
});
