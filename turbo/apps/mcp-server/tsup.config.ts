import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  platform: "node",
  target: "node18",
  banner: {
    js: "#!/usr/bin/env node\n",
  },
  // Bundle workspace packages but keep external dependencies external
  noExternal: [/@uspark\/.*/],
  external: [
    // Node.js built-ins - must be marked as external for Node.js platform
    "assert",
    "crypto",
    "fs",
    "fs/promises",
    "path",
    "stream",
    "util",
    "buffer",
    "url",
    "http",
    "https",
    "net",
    "tls",
    "zlib",
    "events",
    "os",
    "child_process",
    // External npm packages that should not be bundled
    "js-sha256",
    "yjs",
    "@vercel/blob",
  ],
});
