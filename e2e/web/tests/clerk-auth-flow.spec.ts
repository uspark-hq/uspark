import test, { expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

test.describe("Clerk Authentication Flow", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("authentication and protected page access", async ({ page }) => {
    // Navigate to homepage to load Clerk
    await page.goto("/");

    // Sign in with test user
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // Verify can access protected page
    await page.goto("/settings/tokens");
    await expect(page).not.toHaveURL(/sign-in/);

    // Verify page content loads
    const pageTitle = page.locator('h1:has-text("CLI Tokens")');
    await expect(pageTitle).toBeVisible();

    // Verify interactive elements are present
    const tokenInput = page.locator('input[placeholder*="Token"], input[name*="token"]').first();
    await expect(tokenInput).toBeVisible();

    const generateButton = page.locator('button:has-text("Generate")').first();
    await expect(generateButton).toBeVisible();

    // Verify authentication persists across navigation
    await page.goto("/");
    await expect(page).not.toHaveURL(/sign-in/);
  });
});
