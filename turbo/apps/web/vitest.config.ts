import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "web",
    globals: true,
    environment: "jsdom",
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
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
    },
  },
});
