import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Bundle workspace packages
  noExternal: [/@uspark\/.*/],
});
