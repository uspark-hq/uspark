import type { Page, Route } from "@playwright/test";

/**
 * Mock handler for POST /api/projects - Create project
 */
export const createProjectHandler = async (route: Route) => {
  if (route.request().method() !== "POST") {
    await route.continue();
    return;
  }

  const body = await route.request().postDataJSON();
  const mockProjectId = `proj_mock_${Date.now()}`;

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      id: mockProjectId,
      name: body.name || "Test Project",
      user_id: "test_user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_repo_url: body.sourceRepoUrl || null,
      installation_id: body.installationId || null,
    }),
  });
};

/**
 * Setup mock handlers for the page
 * Returns the mock project ID for verification in tests
 */
export async function setupMockHandlers(page: Page): Promise<string> {
  const mockProjectId = `proj_mock_${Date.now()}`;

  // Mock POST /api/projects
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() === "POST") {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockProjectId,
          name: body.name || "Test Project",
          user_id: "test_user",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          source_repo_url: body.sourceRepoUrl || null,
          installation_id: body.installationId || null,
        }),
      });
    } else {
      await route.continue();
    }
  });

  return mockProjectId;
}
