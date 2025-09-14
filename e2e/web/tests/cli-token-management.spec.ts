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

    // Handle organization selection if needed
    await page.waitForLoadState("networkidle");
    const currentUrl = page.url();
    if (currentUrl.includes("choose-organization") || currentUrl.includes("create-organization")) {
      const existingOrg = page.locator('button:has-text("e2e test org"), a:has-text("e2e test org")');
      if (await existingOrg.isVisible({ timeout: 1000 }).catch(() => false)) {
        await existingOrg.click();
      } else {
        const createButton = page.locator('button:has-text("Create"), button:has-text("Continue")');
        if (await createButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          const orgNameInput = page.locator('input[name="name"], input[placeholder*="organization"]');
          if (await orgNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await orgNameInput.fill("e2e test org");
          }
          await createButton.click();
        }
      }
      await page.waitForLoadState("networkidle");
    }

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
