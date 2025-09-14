import { test, expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

test.describe("CLI Token Management", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test.beforeEach(async ({ page }) => {
    // First navigate to homepage to load Clerk
    await page.goto("/");

    // Sign in with test user using emailAddress (requires CLERK_SECRET_KEY)
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // After sign-in, wait for navigation to complete
    await page.waitForTimeout(2000);

    // Navigate to tokens page
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
  });

  test("token management", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/CLI Tokens/i);

    const tokenNameInput = page.locator('input[type="text"]').first();
    await tokenNameInput.fill("My First Token");

    const generateButton = page.locator('button:has-text("Generate")').first();
    await generateButton.click();

    await expect(page.locator("text=Generating")).toBeVisible();

    await expect(page.locator("text=Generating")).not.toBeVisible();
  });
});
