import test, { expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

test.describe("New Project Multi-Step Flow", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("complete multi-step project creation flow with screenshots", async ({ page }) => {
    // Step 1: Sign in with test user
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // Step 2: Navigate to projects page
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    // Check where we ended up after navigation
    const currentUrl = page.url();

    // If redirected to GitHub onboarding, skip to /projects/new directly
    if (currentUrl.includes("/onboarding/github")) {
      await page.goto("/projects/new");
      await page.waitForLoadState("networkidle");
    } else if (!currentUrl.includes("/projects/new")) {
      // User has projects, take screenshot of projects page
      await page.screenshot({
        path: "test-results/multi-step-01-projects-page.png",
        fullPage: true,
      });

      // Step 3: Click "New Project" button
      const newProjectButton = page.locator("button").filter({ hasText: /new project/i }).first();
      await expect(newProjectButton).toBeVisible();
      await newProjectButton.click();

      // Wait for navigation to /projects/new
      await page.waitForURL(/\/projects\/new/);
      await page.waitForLoadState("networkidle");
    }

    // Step 4: Choice Step (new step - choose between GitHub and Manual)
    const choiceHeading = page.getByText("Create a New Project");
    const choiceVisible = await choiceHeading.isVisible().catch(() => false);

    if (choiceVisible) {
      await page.screenshot({
        path: "test-results/multi-step-02-choice-step.png",
        fullPage: true,
      });

      // Click "GitHub Repository" button
      const githubButton = page.locator("button").filter({ hasText: /GitHub Repository/i });
      await expect(githubButton).toBeVisible();
      await githubButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Step 5: GitHub Connection Step (should auto-skip if already connected)
    const githubHeading = page.getByText("Connect Your GitHub Account");
    const repositoryHeading = page.getByText("Enter GitHub Repository");

    // Check which step we're on
    let isOnGitHubStep = false;
    try {
      await githubHeading.waitFor({ state: "visible", timeout: 3000 });
      isOnGitHubStep = true;
    } catch {
      // Not on GitHub step, check for repository step
      try {
        await repositoryHeading.waitFor({ state: "visible", timeout: 3000 });
      } catch {
        // Neither step is visible, take screenshot for debugging
        await page.screenshot({
          path: "test-results/multi-step-debug-unknown-step.png",
          fullPage: true,
        });
        throw new Error("Could not find GitHub or Repository step");
      }
    }

    if (isOnGitHubStep) {
      await page.screenshot({
        path: "test-results/multi-step-03-github-step.png",
        fullPage: true,
      });

      // Note: We can't actually connect GitHub in test environment (requires OAuth)
      // This test documents the GitHub connection step but can't proceed further
      // To test the full flow, the test user must have GitHub already connected
      return;
    }

    // Step 6: Repository Input Step (only if GitHub already connected)
    await expect(repositoryHeading).toBeVisible();
    await page.screenshot({
      path: "test-results/multi-step-04-repository-step.png",
      fullPage: true,
    });

    // Wait for repository input to load
    const repoInput = page.getByPlaceholder(/Enter GitHub URL or owner\/repo/i);
    await expect(repoInput).toBeVisible();

    // Enter a test repository (assuming user has uspark-hq/uspark installed or it's public)
    await repoInput.fill("uspark-hq/uspark");
    await repoInput.blur(); // Trigger verification

    // Wait for verification to complete
    const verifiedMessage = page.getByText("Repository found and verified");
    await expect(verifiedMessage).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: "test-results/multi-step-05-repository-verified.png",
      fullPage: true,
    });

    // Click Continue button
    const continueButton = page.locator("button").filter({ hasText: /continue/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await page.waitForLoadState("networkidle");

    // Step 7: Token Step (conditional - only shown if token not configured)
    // Note: This step was removed in favor of shared DEFAULT_CLAUDE_TOKEN
    // Keeping the code for backward compatibility during transition
    const tokenHeading = page.getByText("Add Your Claude API Key");
    const readyHeading = page.getByText("You're All Set!");

    const isOnTokenStep = await tokenHeading.isVisible();
    if (isOnTokenStep) {
      await page.screenshot({
        path: "test-results/multi-step-06-token-step.png",
        fullPage: true,
      });

      // Fill in token (use fake token for testing)
      const tokenInput = page.locator("input[type='password']");
      await tokenInput.fill("sk-ant-test-token-for-e2e-testing");
      await page.screenshot({
        path: "test-results/multi-step-07-token-filled.png",
        fullPage: true,
      });

      // Click Save and Continue
      const saveButton = page.locator("button").filter({ hasText: /save.*continue/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Step 8: Ready/Final Step
    await expect(readyHeading).toBeVisible();
    await page.screenshot({
      path: "test-results/multi-step-08-ready-step.png",
      fullPage: true,
    });

    // Verify step indicators
    const stepIndicators = page.locator("[class*='step']");
    const completedSteps = page.locator("[class*='completed'], [class*='primary']");
    expect(await completedSteps.count()).toBeGreaterThan(0);

    // Verify "Start Scanning" button is visible
    const startButton = page.locator("button").filter({ hasText: /start scanning/i });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();

    // Take final screenshot before clicking
    await page.screenshot({
      path: "test-results/multi-step-09-before-start.png",
      fullPage: true,
    });

    // Click "Start Scanning" to create project
    await startButton.click();

    // Step 9: Verify redirect to /projects/:id/init page
    await page.waitForURL(/\/projects\/[a-z0-9-]{36}\/init/, { timeout: 10000 });

    expect(page.url()).toMatch(/\/projects\/[a-z0-9-]{36}\/init$/);

    // Step 10: Verify init page shows scan progress
    await page.waitForLoadState("domcontentloaded");

    // Should show "Scanning {projectName}" heading
    const scanningHeading = page.locator("h3").filter({ hasText: /Scanning/i });
    await expect(scanningHeading).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: "test-results/multi-step-10-init-page.png",
      fullPage: true,
    });

    // Note: The init page will auto-redirect to workspace when scan completes,
    // but we don't wait for that in this test to avoid long waits
  });

  test("shows error when token is invalid", async ({ page }) => {
    // Navigate directly to token step (assumes GitHub is connected but token is not)
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    await page.goto("/projects/new");
    await page.waitForLoadState("networkidle");

    // Handle choice step if present
    const choiceHeading = page.getByText("Create a New Project");
    const choiceVisible = await choiceHeading.isVisible().catch(() => false);
    if (choiceVisible) {
      const githubButton = page.locator("button").filter({ hasText: /GitHub Repository/i });
      await githubButton.click();
      await page.waitForLoadState("networkidle");
    }

    // If we're on the repository step, proceed
    const repositoryHeading = page.getByText("Enter GitHub Repository");
    if (await repositoryHeading.isVisible()) {
      const repoInput = page.getByPlaceholder(/Enter GitHub URL or owner\/repo/i);
      await repoInput.fill("uspark-hq/uspark");
      await repoInput.blur();

      // Wait for verification
      const verifiedMessage = page.getByText("Repository found and verified");
      await expect(verifiedMessage).toBeVisible({ timeout: 10000 });

      const continueButton = page.locator("button").filter({ hasText: /continue/i });
      await continueButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Check if we're on token step
    const tokenHeading = page.getByText("Add Your Claude API Key");
    if (await tokenHeading.isVisible()) {
      // Fill in invalid token
      const tokenInput = page.locator("input[type='password']");
      await tokenInput.fill("invalid-token");

      // Click Save and Continue
      const saveButton = page.locator("button").filter({ hasText: /save.*continue/i });
      await saveButton.click();
      await page.waitForLoadState("networkidle");

      // Wait for error message
      const errorMessage = page.locator("[class*='destructive']").filter({ hasText: /error|invalid|failed/i });
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      await page.screenshot({
        path: "test-results/multi-step-error-invalid-token.png",
        fullPage: true,
      });
    }
  });

  test("complete manual project creation and verify workspace redirect", async ({ page }) => {
    // Step 1: Sign in with test user
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // Step 2: Navigate to project creation page
    await page.goto("/projects/new");
    await page.waitForLoadState("networkidle");

    // Step 3: Click "Create Project Manually" button
    const choiceHeading = page.getByText("Create a New Project");
    await expect(choiceHeading).toBeVisible();

    const manualButton = page.locator("button").filter({ hasText: /Create Project Manually/i });
    await expect(manualButton).toBeVisible();
    await manualButton.click();
    await page.waitForLoadState("networkidle");

    // Step 4: Enter project name with timestamp to make it unique
    const nameHeading = page.getByText("Name Your Project");
    await expect(nameHeading).toBeVisible();

    const projectName = `E2E Test Project ${Date.now()}`;
    const projectNameInput = page.getByPlaceholder("My Awesome Project");
    await expect(projectNameInput).toBeVisible();
    await projectNameInput.fill(projectName);

    // Step 5: Click Continue
    const continueButton = page.locator("button").filter({ hasText: /Continue/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await page.waitForLoadState("networkidle");

    // Step 6: Verify "You're All Set!" page
    const readyHeading = page.getByText("You're All Set!");
    await expect(readyHeading).toBeVisible();

    // Verify project name is displayed
    await expect(page.getByText(projectName)).toBeVisible();

    // Step 7: Click "Create Project" button (real creation, no mock)
    const createButton = page.locator("button").filter({ hasText: /Create Project/i });
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Step 8: Wait for navigation to project page
    // In production: redirects to app.uspark.ai/projects/{projectId}
    // In preview: stays on same domain /projects/{projectId}
    // Note: Uses default timeout (30s from playwright.config.ts) which is sufficient
    // for database write + page redirect in both production and preview environments
    await page.waitForURL((url) => {
      const urlString = url.toString();
      return urlString.includes("/projects/") && !urlString.includes("/projects/new");
    });

    // Step 9: Verify we're on the project page with valid UUID
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/projects\/[a-z0-9-]{36}/);

    // Verify the project page loads successfully
    await page.waitForLoadState("domcontentloaded");

    // The page should have loaded without errors
    // We can check for common elements like the main content area
    const mainContent = page.locator('main, [role="main"], body').first();
    await expect(mainContent).toBeVisible();
  });
});
