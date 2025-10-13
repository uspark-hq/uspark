import test, { expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

test.describe("Projects Page UI Check", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("capture projects list and create dialog screenshots", async ({
    page,
  }) => {
    // Sign in with test user
    await page.goto("/");
    await clerk.signIn({
      page,
      emailAddress: "e2e+clerk_test@uspark.ai",
    });

    // Navigate to projects page
    await page.goto("/projects");

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Take screenshot of projects list page (empty or with projects)
    await page.screenshot({
      path: "test-results/projects-list.png",
      fullPage: true,
    });

    console.log("✅ Captured projects list screenshot");

    // Look for "New Project" button in header (only shows when projects exist)
    const headerButton = page.locator('button:has-text("New Project")');

    // Look for "Create Project" button in empty state
    const emptyStateButton = page.locator('button:has-text("Create Project")');

    // Click whichever button is visible
    const isHeaderButtonVisible = await headerButton.isVisible();
    if (isHeaderButtonVisible) {
      await headerButton.click();
    } else {
      await emptyStateButton.click();
    }

    // Wait for dialog to appear
    await page.waitForSelector('div[role="dialog"]', { state: "visible" });

    // Take screenshot of create project dialog
    await page.screenshot({
      path: "test-results/create-project-dialog.png",
      fullPage: true,
    });

    console.log("✅ Captured create project dialog screenshot");

    // Verify dialog elements are present
    await expect(
      page.locator('div[role="dialog"]:has-text("Create New Project")')
    ).toBeVisible();
    await expect(page.locator('input[placeholder*="name"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create Project")')).toBeVisible();

    console.log("✅ All UI elements verified");
  });
});
