import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Vitest Projects configuration for monorepo
 * Using centralized configuration pattern (Mode 1)
 */
export default defineConfig({
  test: {
    passWithNoTests: true,

    // Coverage configuration (only at root level)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "**/*.config.*",
        "**/coverage/**",
        "**/*.d.ts",
        "**/*.spec.{ts,tsx,js,jsx}",
        "**/*.test.{ts,tsx,js,jsx}",
        "**/__tests__/**",
        "**/.next/**",
        "**/dist/**",
        "packages/eslint-config/*.js",
      ],
    },

    // Use GitHub Actions reporter in CI
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],

    // Projects configuration
    projects: [
      // CLI Application - Node environment
      {
        test: {
          name: "cli",
          root: "./apps/cli",
          environment: "node",
          setupFiles: ["./src/test/setup.ts"],
        },
      },

      // Core Package - Node environment with MSW
      {
        test: {
          name: "core",
          root: "./packages/core",
          environment: "node",
          setupFiles: ["./src/test/msw-setup.ts"],
        },
      },

      // Web Application - Mixed environments
      {
        plugins: [react()], // React plugin for TSX tests
        test: {
          name: "web",
          root: "./apps/web",
          setupFiles: ["./src/test/setup.ts", "./src/test/db-setup.ts"],
          globalSetup: "./src/test/global-setup.ts",
          environmentMatchGlobs: [
            // Use Node environment for API route tests
            ["app/api/**/*.test.ts", "node"],
            ["app/api/**/*.test.tsx", "node"],
            // Use Node environment for server-side library tests
            ["src/lib/**/*.test.ts", "node"],
            ["src/test/**/*.test.ts", "node"],
            // Use jsdom for component tests
            ["app/**/*.test.tsx", "jsdom"],
            ["src/**/*.test.tsx", "jsdom"],
          ],
        },
      },

      // UI Package - Happy-DOM environment (faster than jsdom)
      {
        plugins: [react()], // React plugin for TSX tests
        test: {
          name: "ui",
          root: "./packages/ui",
          environment: "happy-dom",
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
