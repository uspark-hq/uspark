import test, { expect } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

test.describe("Clerk Authentication Flow", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("can access protected pages", async ({ page }) => {
    const testingToken = process.env.CLERK_TESTING_TOKEN;
    await page.goto(`/settings/tokens#__clerk_testing_token=${testingToken}`);

    const pageTitle = page.locator('h1:has-text("CLI Tokens")');
    await expect(pageTitle).toBeVisible();
  });

  test("maintains authentication across navigation", async ({ page }) => {
    const testingToken = process.env.CLERK_TESTING_TOKEN;
    await page.goto(`/settings/tokens#__clerk_testing_token=${testingToken}`);
    await expect(page).not.toHaveURL(/sign-in/);

    await page.goto(`/#__clerk_testing_token=${testingToken}`);
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("can interact with protected features", async ({ page }) => {
    const testingToken = process.env.CLERK_TESTING_TOKEN;
    await page.goto(`/settings/tokens#__clerk_testing_token=${testingToken}`);

    const tokenInput = page
      .locator('input[placeholder*="Token"], input[name*="token"]')
      .first();
    await expect(tokenInput).toBeVisible();

    const generateButton = page.locator('button:has-text("Generate")').first();
    await expect(generateButton).toBeVisible();
  });
});
