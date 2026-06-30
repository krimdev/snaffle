import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/index.tsx" },
  format: ["cjs"],
  target: "node20",
  outExtension: () => ({ js: ".cjs" }),
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});
