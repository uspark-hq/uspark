import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "cli",
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
  },
});
