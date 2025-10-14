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

    // Check if we're auto-redirected to /projects/new (for users with no projects)
    const currentUrl = page.url();
    const isAutoRedirected = currentUrl.includes("/projects/new");

    if (!isAutoRedirected) {
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

    // Step 4: GitHub Connection Step (should auto-skip if already connected)
    const githubHeading = page.getByText("Connect Your GitHub Account");
    const repositoryHeading = page.getByText("Select a Repository");

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
        path: "test-results/multi-step-02-github-step.png",
        fullPage: true,
      });

      // Note: We can't actually connect GitHub in test environment (requires OAuth)
      // This test documents the GitHub connection step but can't proceed further
      // To test the full flow, the test user must have GitHub already connected
      return;
    }

    // Step 5: Repository Selection Step (only if GitHub already connected)
    await expect(repositoryHeading).toBeVisible();
    await page.screenshot({
      path: "test-results/multi-step-03-repository-step.png",
      fullPage: true,
    });

    // Wait for repository selector to load
    const repoSelect = page.locator("select");
    await expect(repoSelect).toBeVisible();

    // Select first available repository
    await repoSelect.selectOption({ index: 1 }); // Index 0 is the placeholder
    await page.screenshot({
      path: "test-results/multi-step-04-repository-selected.png",
      fullPage: true,
    });

    // Click Continue button
    const continueButton = page.locator("button").filter({ hasText: /continue/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await page.waitForLoadState("networkidle");

    // Step 6: Token Step (conditional - only shown if token not configured)
    const tokenHeading = page.getByText("Add Your Claude API Key");
    const readyHeading = page.getByText("You're All Set!");

    const isOnTokenStep = await tokenHeading.isVisible();
    if (isOnTokenStep) {
      await page.screenshot({
        path: "test-results/multi-step-05-token-step.png",
        fullPage: true,
      });

      // Fill in token (use fake token for testing)
      const tokenInput = page.locator("input[type='password']");
      await tokenInput.fill("sk-ant-test-token-for-e2e-testing");
      await page.screenshot({
        path: "test-results/multi-step-06-token-filled.png",
        fullPage: true,
      });

      // Click Save and Continue
      const saveButton = page.locator("button").filter({ hasText: /save.*continue/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Step 7: Ready/Final Step
    await expect(readyHeading).toBeVisible();
    await page.screenshot({
      path: "test-results/multi-step-07-ready-step.png",
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
      path: "test-results/multi-step-08-before-start.png",
      fullPage: true,
    });

    // Note: We don't actually click "Start Scanning" to avoid creating projects in test environment
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

    // If we're on the repository step, proceed
    const repositoryHeading = page.getByText("Select a Repository");
    if (await repositoryHeading.isVisible()) {
      const repoSelect = page.locator("select");
      await repoSelect.selectOption({ index: 1 });
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
});
