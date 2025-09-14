import { defineConfig, devices } from "@playwright/test";

import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 4,
  reporter: "list",
  timeout: 15000,
  use: {
    baseURL: process.env.BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10000, // 10 seconds for actions
    navigationTimeout: 10000, // 10 seconds for navigation
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
