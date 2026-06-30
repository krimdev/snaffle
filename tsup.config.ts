import { defineConfig } from "tsup";

// Ink (and its deps) are ESM with top-level await, so the CLI must ship as ESM —
// a CJS bundle that require()s ink throws ERR_REQUIRE_ASYNC_MODULE on Node 20+.
export default defineConfig({
  entry: { cli: "src/index.tsx" },
  format: ["esm"],
  target: "node20",
  splitting: false,
  outExtension: () => ({ js: ".mjs" }),
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});
