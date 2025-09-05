import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "core",
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/msw-setup.ts"],
  },
});
