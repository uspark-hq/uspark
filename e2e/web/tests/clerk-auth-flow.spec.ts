import test, { expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

test.describe("Clerk Authentication Flow", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("can access protected pages", async ({ page }) => {
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

    // Now navigate to protected page
    await page.goto("/settings/tokens");

    const pageTitle = page.locator('h1:has-text("CLI Tokens")');
    await expect(pageTitle).toBeVisible();
  });

  test("maintains authentication across navigation", async ({ page }) => {
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

    await page.goto("/settings/tokens");
    await expect(page).not.toHaveURL(/sign-in/);

    await page.goto("/");
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("can interact with protected features", async ({ page }) => {
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

    await page.goto("/settings/tokens");

    const tokenInput = page
      .locator('input[placeholder*="Token"], input[name*="token"]')
      .first();
    await expect(tokenInput).toBeVisible();

    const generateButton = page.locator('button:has-text("Generate")').first();
    await expect(generateButton).toBeVisible();
  });
});
