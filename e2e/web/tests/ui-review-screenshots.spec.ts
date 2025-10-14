import test, { expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

test.describe("UI Review Screenshot Capture", () => {
  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("capture homepage screenshot", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });

    await page.waitForSelector("body", { timeout: 10000 }).catch(() => {});

    await page.screenshot({
      path: "test-results/ui-review-homepage.png",
      fullPage: true,
    });
  });

  test("capture sign-in page screenshot", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded", timeout: 60000 });

    await page.waitForSelector("body", { timeout: 10000 }).catch(() => {});

    await page.screenshot({
      path: "test-results/ui-review-signin.png",
      fullPage: true,
    });
  });

  test("capture authenticated pages screenshots", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });

    try {
      await clerk.signIn({
        page,
        emailAddress: "e2e+clerk_test@uspark.ai",
      });
    } catch (error) {
      await page.screenshot({
        path: "test-results/ui-review-auth-error.png",
        fullPage: true,
      });
    }

    await page.goto("/projects", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("body", { timeout: 10000 }).catch(() => {});

    await page.screenshot({
      path: "test-results/ui-review-projects.png",
      fullPage: true,
    });

    await page.goto("/settings", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("body", { timeout: 10000 }).catch(() => {});

    await page.screenshot({
      path: "test-results/ui-review-settings.png",
      fullPage: true,
    });
  });
});
