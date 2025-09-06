import { test, expect } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

test.describe("CLI Token Management", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test.beforeEach(async ({ page }) => {
    const testingToken = process.env.CLERK_TESTING_TOKEN;
    await page.goto(`/settings/tokens#__clerk_testing_token=${testingToken}`);
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
