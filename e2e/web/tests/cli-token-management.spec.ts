import { test, expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

test.describe("CLI Token Management", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test.beforeEach(async ({ page }) => {
    // First navigate to homepage to load Clerk
    await page.goto("/");

    // Sign in with test user credentials
    await clerk.signIn({
      page,
      signInParams: {
        strategy: "password",
        identifier: process.env.E2E_CLERK_USER_USERNAME || process.env.E2E_CLERK_USER_EMAIL!,
        password: process.env.E2E_CLERK_USER_PASSWORD!,
      },
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
