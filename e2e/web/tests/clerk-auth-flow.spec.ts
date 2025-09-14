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

    // Check if we need to handle organization selection
    await page.waitForLoadState("networkidle");
    const currentUrl = page.url();
    if (currentUrl.includes("choose-organization") || currentUrl.includes("create-organization")) {
      // Try to select existing organization or create one
      const existingOrg = page.locator('button:has-text("e2e test org"), a:has-text("e2e test org")');
      if (await existingOrg.isVisible({ timeout: 1000 }).catch(() => false)) {
        await existingOrg.click();
      } else {
        // Create organization if needed
        const createButton = page.locator('button:has-text("Create"), button:has-text("Continue")');
        if (await createButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Fill org name if input exists
          const orgNameInput = page.locator('input[name="name"], input[placeholder*="organization"]');
          if (await orgNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await orgNameInput.fill("e2e test org");
          }
          await createButton.click();
        }
      }
      await page.waitForLoadState("networkidle");
    }

    // Now navigate to protected page
    await page.goto("/settings/tokens");

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

    await page.goto("/settings/tokens");
    await expect(page).not.toHaveURL(/sign-in/);

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

    await page.goto("/settings/tokens");

    const tokenInput = page
      .locator('input[placeholder*="Token"], input[name*="token"]')
      .first();
    await expect(tokenInput).toBeVisible();

    const generateButton = page.locator('button:has-text("Generate")').first();
    await expect(generateButton).toBeVisible();
  });
});
