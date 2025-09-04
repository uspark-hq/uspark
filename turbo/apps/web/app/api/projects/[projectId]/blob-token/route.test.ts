import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { NextRequest } from "next/server";

describe("GET /api/projects/[projectId]/blob-token", () => {
  beforeEach(() => {
    initServices();
  });

  it("should return STS token for existing project", async () => {
    const projectId = "test-project";
    const userId = "test-user";

    // Create test project
    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId,
      ydocData: Buffer.from("test").toString("base64"),
      version: 0,
    });

    // Call the API
    const request = new NextRequest("http://localhost/api/projects/test-project/blob-token");
    const response = await GET(request, {
      params: Promise.resolve({ projectId }),
    });

    // Check response
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("token");
    expect(data).toHaveProperty("expiresAt");
    expect(data).toHaveProperty("uploadUrl");
    expect(data).toHaveProperty("downloadUrlPrefix");
    expect(data.token).toContain("vercel_blob_rw_test-project");
  });

  it("should return 404 for non-existent project", async () => {
    const projectId = "non-existent";

    const request = new NextRequest("http://localhost/api/projects/non-existent/blob-token");
    const response = await GET(request, {
      params: Promise.resolve({ projectId }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("project_not_found");
  });

  it("should return 404 for project owned by different user", async () => {
    const projectId = "other-user-project";

    // Create project owned by different user
    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId: "other-user",
      ydocData: Buffer.from("test").toString("base64"),
      version: 0,
    });

    const request = new NextRequest("http://localhost/api/projects/other-user-project/blob-token");
    const response = await GET(request, {
      params: Promise.resolve({ projectId }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("project_not_found");
  });
});