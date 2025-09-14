import { test, expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

test.describe("CLI Token Management", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("token generation workflow", async ({ page }) => {
    // Navigate and sign in
    await page.goto("/");
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // Navigate to tokens page
    await page.goto("/settings/tokens");
    await expect(page.locator("h1")).toContainText(/CLI Tokens/i);

    // Fill token name and generate
    const tokenNameInput = page.locator('input[type="text"]').first();
    await tokenNameInput.fill("Test Token");

    const generateButton = page.locator('button:has-text("Generate")').first();
    await generateButton.click();

    // Verify generation starts
    await expect(page.locator("text=Generating")).toBeVisible();
  });
});
