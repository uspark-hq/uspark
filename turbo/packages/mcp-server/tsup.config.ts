import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: false, // Disable shims to avoid issues with ESM
  banner: {
    js: "#!/usr/bin/env node\n",
  },
  // Bundle workspace packages
  noExternal: [/@uspark\/.*/],
});
