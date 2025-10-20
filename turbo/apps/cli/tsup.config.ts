import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  platform: "node",
  target: "node18",
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Bundle workspace packages but keep external dependencies external
  noExternal: [/@uspark\/.*/],
  external: [
    // External npm packages that have native/dynamic requires
    "js-sha256",
    "yjs",
    "@vercel/blob",
  ],
});
