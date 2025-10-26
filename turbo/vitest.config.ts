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
          setupFiles: ["./packages/core/src/test/msw-setup.ts"],
        },
      },

      // Web app - Node environment (API routes, utilities, database)
      {
        plugins: [react()],
        test: {
          name: "web:node",
          root: "./apps/web",
          environment: "node",
          include: [
            "app/api/**/*.test.ts",
            "app/api/**/*.test.tsx",
            "app/components/**/*.test.ts", // Non-JSX tests in components (e.g., parsers)
            "src/lib/**/*.test.ts",
            "src/test/**/*.test.ts",
            "src/db/**/*.test.ts",
          ],
          setupFiles: ["./src/test/setup.ts", "./src/test/db-setup.ts"],
          globalSetup: "./src/test/global-setup.ts",
        },
      },

      // Web app - JSDOM environment (React components, client-side code)
      {
        plugins: [react()],
        test: {
          name: "web:jsdom",
          root: "./apps/web",
          environment: "jsdom",
          include: ["app/**/*.test.tsx", "src/**/*.test.tsx"],
          exclude: [
            "app/api/**/*.test.tsx", // API routes use node environment
          ],
          setupFiles: ["./src/test/setup.ts", "./src/test/db-setup.ts"],
          globalSetup: "./src/test/global-setup.ts",
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

      {
        test: {
          name: "vscode-extension",
          root: "./apps/vscode-extension",
          environment: "node",
          exclude: ["**/node_modules/**", "**/out/**"],
          setupFiles: ["./src/test/msw-setup.ts"],
        },
      },
    ],
  },
});
