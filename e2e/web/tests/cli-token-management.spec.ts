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

    // Navigate to tokens page
    await page.goto("/settings/tokens");
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
