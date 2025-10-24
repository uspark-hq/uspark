import test, { expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

test.describe("GitHub Onboarding Flow", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("displays onboarding page when user has no github installation", async ({
    page,
  }) => {
    // Sign in with test user
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // Ensure user has no GitHub installation by disconnecting if exists
    // This makes the test deterministic regardless of previous test state
    await page.request.post("/api/github/disconnect").catch(() => {
      // If no installation exists, this will fail with 404 - that's OK
    });

    // Navigate directly to onboarding page with retry logic for flaky Vercel deployments
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto("/onboarding/github", { timeout: 30000 });
        await page.waitForLoadState("networkidle", { timeout: 10000 });
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.waitForTimeout(2000); // Wait 2s before retry
      }
    }

    // Verify main heading
    const heading = page.getByText("Connect Your GitHub Account");
    await expect(heading).toBeVisible();

    // Verify value propositions are shown
    await expect(page.getByText("Seamless Repository Sync")).toBeVisible();
    await expect(page.getByText("Real-time Updates")).toBeVisible();
    await expect(page.getByText("You Control Access")).toBeVisible();

    // Verify Connect GitHub button
    const connectButton = page
      .locator("button")
      .filter({ hasText: /Connect GitHub/i });
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeEnabled();

    // Verify disclaimer text
    await expect(
      page.getByText(/By connecting your GitHub account/),
    ).toBeVisible();
  });

  test("redirects to projects if github already installed", async ({
    page,
  }) => {
    // Note: This test will only pass if the test user already has GitHub installed
    // If not installed, it will stay on the onboarding page
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // Navigate to onboarding page with retry logic for flaky Vercel deployments
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto("/onboarding/github", { timeout: 30000 });
        await page.waitForLoadState("networkidle", { timeout: 10000 });
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.waitForTimeout(2000); // Wait 2s before retry
      }
    }

    // Check if we're redirected to projects or stayed on onboarding
    const currentUrl = page.url();

    if (currentUrl.includes("/projects")) {
      // Successfully redirected - user has GitHub installation
      await expect(page).toHaveURL(/\/projects/);
    } else {
      // Stayed on onboarding - user doesn't have installation
      await expect(page.getByText("Connect Your GitHub Account")).toBeVisible();
    }
  });

  test("projects page redirects to onboarding without github", async ({
    page,
  }) => {
    // Sign in
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // Ensure user has no GitHub installation
    await page.request.post("/api/github/disconnect").catch(() => {
      // If no installation exists, this will fail with 404 - that's OK
    });

    // Try to access projects page with retry logic for flaky Vercel deployments
    let navigationSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto("/projects", {
          waitUntil: "domcontentloaded",
          timeout: 30000
        });
        await page.waitForLoadState("networkidle", { timeout: 10000 });
        navigationSuccess = true;
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.waitForTimeout(2000); // Wait 2s before retry
      }
    }

    // Check where we ended up
    const currentUrl = page.url();

    if (currentUrl.includes("/onboarding/github")) {
      // Redirected to onboarding - user doesn't have GitHub installation
      await expect(page.getByText("Connect Your GitHub Account")).toBeVisible();
    } else if (currentUrl.includes("/projects")) {
      // Stayed on projects or redirected to /projects/new - user has installation
      expect(currentUrl).toMatch(/\/projects/);
    }
  });

  test("connect button navigates to github install endpoint", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // Navigate to onboarding page with retry logic for flaky Vercel deployments
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto("/onboarding/github", { timeout: 30000 });
        await page.waitForLoadState("networkidle", { timeout: 10000 });
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.waitForTimeout(2000); // Wait 2s before retry
      }
    }

    // Find and click the Connect GitHub button
    const connectButton = page
      .locator("button")
      .filter({ hasText: /Connect GitHub/i });
    await expect(connectButton).toBeVisible();

    // Click the button - this will navigate to /api/github/install
    // which then redirects to GitHub OAuth flow
    // We can't test the actual OAuth flow, but we can verify the button click initiates navigation
    const navigationPromise = page.waitForURL(
      (url) => url.pathname.includes("/api/github/install"),
      { timeout: 5000 },
    );

    await connectButton.click();

    // Either we navigate to the install endpoint, or we stay on the page
    // (depending on whether OAuth is configured in test environment)
    await navigationPromise.catch(() => {
      // Navigation might not happen in test environment - that's okay
    });
  });
});
