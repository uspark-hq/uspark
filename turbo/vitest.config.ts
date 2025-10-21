/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  test: {
    passWithNoTests: true,

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

    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],

    projects: [
      {
        test: {
          name: "cli",
          root: "./apps/cli",
          environment: "node",
          setupFiles: ["./src/test/setup.ts"],
        },
      },

      {
        test: {
          name: "core",
          root: "./packages/core",
          environment: "node",
          setupFiles: ["./src/test/msw-setup.ts"],
        },
      },

      {
        test: {
          name: "core-node",
          root: "./packages/core-node",
          environment: "node",
        },
      },

      {
        plugins: [react()],
        test: {
          name: "web",
          root: "./apps/web",
          setupFiles: ["./src/test/setup.ts", "./src/test/db-setup.ts"],
          globalSetup: "./src/test/global-setup.ts",
          environmentMatchGlobs: [
            ["app/api/**/*.test.ts", "node"],
            ["app/api/**/*.test.tsx", "node"],
            ["src/lib/**/*.test.ts", "node"],
            ["src/test/**/*.test.ts", "node"],
            ["app/**/*.test.tsx", "jsdom"],
            ["src/**/*.test.tsx", "jsdom"],
          ],
        },
      },

      {
        plugins: [react()],
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
