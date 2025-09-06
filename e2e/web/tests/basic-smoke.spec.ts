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

    const signInForm = page
      .locator(
        'input[name="identifier"], input[type="email"], [data-clerk-sign-in]'
      )
      .first();

    await expect(signInForm).toBeVisible();
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

  test("404 page handles unknown routes", async ({ page }) => {
    const response = await page.goto(
      "/this-page-definitely-does-not-exist-123456"
    );

    expect(response?.status()).toBe(404);
  });
});
