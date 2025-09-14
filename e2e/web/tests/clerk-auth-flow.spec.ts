import test, { expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

test.describe("Clerk Authentication Flow", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("can access protected pages", async ({ page }) => {
    // First navigate to homepage to load Clerk
    await page.goto("/");

    // Sign in with test user using emailAddress (requires CLERK_SECRET_KEY)
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // After sign-in, wait for navigation to complete
    await page.waitForTimeout(2000); // Give Clerk time to redirect

    // Navigate to protected page - this will trigger org selection if needed
    await page.goto("/settings/tokens");

    // Wait for any redirects to complete
    await page.waitForLoadState("networkidle");

    // Check if we're on the organization selection/creation page
    const setupOrgHeader = page.locator('h1:has-text("Setup your organization")');
    if (await setupOrgHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
      // We need to create an organization
      // Look for the organization name input
      const orgNameInput = page.locator('input').first(); // Usually the first input on org creation
      await orgNameInput.fill("e2e test org");

      // Click the create/continue button
      const createButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Continue")');
      await createButton.click();

      // Wait for navigation after org creation
      await page.waitForLoadState("networkidle");
    }

    // We should now be on the tokens page
    const pageTitle = page.locator('h1:has-text("CLI Tokens")');
    await expect(pageTitle).toBeVisible();
  });

  test("maintains authentication across navigation", async ({ page }) => {
    // First navigate to homepage to load Clerk
    await page.goto("/");

    // Sign in with test user using emailAddress (requires CLERK_SECRET_KEY)
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // After sign-in, wait for navigation to complete
    await page.waitForTimeout(2000);

    // Navigate to protected page
    await page.goto("/settings/tokens");
    await page.waitForLoadState("networkidle");

    // Handle org creation if needed
    const setupOrgHeader = page.locator('h1:has-text("Setup your organization")');
    if (await setupOrgHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
      const orgNameInput = page.locator('input').first();
      await orgNameInput.fill("e2e test org");
      const createButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Continue")');
      await createButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Verify we're not on sign-in page
    await expect(page).not.toHaveURL(/sign-in/);

    // Navigate to home and verify still authenticated
    await page.goto("/");
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("can interact with protected features", async ({ page }) => {
    // First navigate to homepage to load Clerk
    await page.goto("/");

    // Sign in with test user using emailAddress (requires CLERK_SECRET_KEY)
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // After sign-in, wait for navigation to complete
    await page.waitForTimeout(2000);

    // Navigate to protected page
    await page.goto("/settings/tokens");
    await page.waitForLoadState("networkidle");

    // Handle org creation if needed
    const setupOrgHeader = page.locator('h1:has-text("Setup your organization")');
    if (await setupOrgHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
      const orgNameInput = page.locator('input').first();
      await orgNameInput.fill("e2e test org");
      const createButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Continue")');
      await createButton.click();
      await page.waitForLoadState("networkidle");
    }

    const tokenInput = page
      .locator('input[placeholder*="Token"], input[name*="token"]')
      .first();
    await expect(tokenInput).toBeVisible();

    const generateButton = page.locator('button:has-text("Generate")').first();
    await expect(generateButton).toBeVisible();
  });
});
