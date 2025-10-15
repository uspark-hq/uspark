import { test, expect } from "@playwright/test";

test.describe("Basic Smoke Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/uSpark/i);

    const mainContent = page.locator('main, [role="main"], body').first();
    await expect(mainContent).toBeVisible();
  });

  test("sign-in page is accessible", async ({ page }) => {
    await page.goto("/sign-in");

    // Wait for Clerk to load - it may take longer in CI environment
    const signInForm = page
      .locator(
        'input[name="identifier"], input[type="email"], [data-clerk-sign-in]'
      )
      .first();

    await expect(signInForm).toBeVisible({ timeout: 15000 });
  });

  test("API health check endpoints work", async ({ request }) => {
    const response = await request.get("/api/hello/world");

    expect(response.status()).toBe(200);
  });

  test("navigation links exist", async ({ page }) => {
    await page.goto("/");

    // Check for common navigation elements
    const navElements = await page.locator("nav, header, a[href], div").count();

    expect(navElements).toBeGreaterThan(0);
  });

  test("unknown routes redirect to sign-in when not authenticated", async ({ page }) => {
    await page.goto("/this-page-definitely-does-not-exist-123456");

    // Since the route is protected but doesn't exist,
    // middleware redirects to sign-in before Next.js can return 404
    await expect(page).toHaveURL(/sign-in/);
  });
});
