import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { POST as createProject } from "../../route";
import { PATCH as updateProject } from "../route";
import * as Y from "yjs";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { PROJECT_VERSIONS_TBL } from "../../../../../src/db/schema/project-versions";
import { eq } from "drizzle-orm";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
  })),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("GET /api/projects/:projectId/diff", () => {
  const userId = `test-user-${Date.now()}-${process.pid}`;
  let testProjectId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    initServices();

    // Create a test project
    const createRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: `test-project-${Date.now()}` }),
    });
    const createResponse = await createProject(createRequest);
    const createdProject = await createResponse.json();
    testProjectId = createdProject.id;
  });

  it("should return 400 if fromVersion parameter is missing", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/projects/${testProjectId}/diff`,
    );
    const context = { params: Promise.resolve({ projectId: testProjectId }) };

    const response = await GET(request, context);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("fromVersion parameter required");
  });

  it("should return 400 if fromVersion is invalid", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/projects/${testProjectId}/diff?fromVersion=invalid`,
    );
    const context = { params: Promise.resolve({ projectId: testProjectId }) };

    const response = await GET(request, context);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("invalid fromVersion");
  });

  it("should return 304 if client is current (no updates)", async () => {
    // In test env, server polls only once (MAX_POLLS=1) instead of 5 times
    // This makes tests fast while production still gets 5-second polling
    const request = new NextRequest(
      `http://localhost:3000/api/projects/${testProjectId}/diff?fromVersion=0`,
    );
    const context = { params: Promise.resolve({ projectId: testProjectId }) };

    const response = await GET(request, context);

    expect(response.status).toBe(304);
    expect(response.headers.get("X-Version")).toBe("0");
  });

  it("should return diff when version has changed", async () => {
    // Update project to create version 1
    const updateDoc = new Y.Doc();
    const files = updateDoc.getMap("files");
    files.set("test.txt", { hash: "abc123", mtime: Date.now() });
    const update = Y.encodeStateAsUpdate(updateDoc);

    const updateRequest = new NextRequest("http://localhost:3000", {
      method: "PATCH",
      body: Buffer.from(update),
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Version": "0",
      },
    });
    const updateContext = {
      params: Promise.resolve({ projectId: testProjectId }),
    };
    const updateResponse = await updateProject(updateRequest, updateContext);
    expect(updateResponse.status).toBe(200);

    // Request diff from version 0
    const request = new NextRequest(
      `http://localhost:3000/api/projects/${testProjectId}/diff?fromVersion=0`,
    );
    const context = { params: Promise.resolve({ projectId: testProjectId }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/octet-stream",
    );
    expect(response.headers.get("X-Version")).toBe("1");

    // Verify response format: [length][stateVector][diff]
    const responseBinary = await response.arrayBuffer();
    const responseArray = new Uint8Array(responseBinary);

    // Read state vector length
    const view = new DataView(responseBinary);
    const stateVectorLength = view.getUint32(0, false);

    // Extract state vector
    const stateVector = responseArray.slice(4, 4 + stateVectorLength);
    expect(stateVector.length).toBe(stateVectorLength);

    // Extract diff
    const diff = responseArray.slice(4 + stateVectorLength);

    // Apply diff to verify it works
    const clientDoc = new Y.Doc();
    Y.applyUpdate(clientDoc, diff);

    const clientFiles = clientDoc.getMap("files");
    expect(clientFiles.size).toBe(1);
    expect(clientFiles.get("test.txt")).toHaveProperty("hash", "abc123");
  });

  it("should return 404 if fromVersion not found in history", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/projects/${testProjectId}/diff?fromVersion=999`,
    );
    const context = { params: Promise.resolve({ projectId: testProjectId }) };

    const response = await GET(request, context);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("version not found");
  });

  it("should handle multiple version jumps", async () => {
    // Create version 1
    const doc1 = new Y.Doc();
    doc1.getMap("files").set("file1.txt", { hash: "hash1", mtime: 1 });
    const update1 = Y.encodeStateAsUpdate(doc1);

    await updateProject(
      new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: Buffer.from(update1),
        headers: { "X-Version": "0" },
      }),
      { params: Promise.resolve({ projectId: testProjectId }) },
    );

    // Create version 2
    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, update1);
    doc2.getMap("files").set("file2.txt", { hash: "hash2", mtime: 2 });
    const stateVector1 = Y.encodeStateVector(new Y.Doc());
    Y.applyUpdate(new Y.Doc(), update1);
    const update2 = Y.encodeStateAsUpdate(doc2, stateVector1);

    await updateProject(
      new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: Buffer.from(update2),
        headers: { "X-Version": "1" },
      }),
      { params: Promise.resolve({ projectId: testProjectId }) },
    );

    // Request diff from version 0 to version 2
    const request = new NextRequest(
      `http://localhost:3000/api/projects/${testProjectId}/diff?fromVersion=0`,
    );
    const context = { params: Promise.resolve({ projectId: testProjectId }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Version")).toBe("2");

    // Verify response format and extract diff
    const responseBinary = await response.arrayBuffer();
    const responseArray = new Uint8Array(responseBinary);

    const view = new DataView(responseBinary);
    const stateVectorLength = view.getUint32(0, false);

    const diff = responseArray.slice(4 + stateVectorLength);

    // Verify diff includes both files
    const clientDoc = new Y.Doc();
    Y.applyUpdate(clientDoc, diff);

    const clientFiles = clientDoc.getMap("files");
    expect(clientFiles.size).toBe(2);
    expect(clientFiles.get("file1.txt")).toHaveProperty("hash", "hash1");
    expect(clientFiles.get("file2.txt")).toHaveProperty("hash", "hash2");
  });

  it("should cleanup test data", async () => {
    // Clean up project and versions
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, testProjectId));

    // Verify versions were cascade deleted
    const versions = await globalThis.services.db
      .select()
      .from(PROJECT_VERSIONS_TBL)
      .where(eq(PROJECT_VERSIONS_TBL.projectId, testProjectId));

    expect(versions.length).toBe(0);
  });
});
