import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Everything snaffle produces lands in one obvious place the user already knows:
// their Downloads folder, under a `snaffle` subfolder so it stays tidy and is
// easy to find (and easy to clear). Created lazily on first use.
export function outputDir(): string {
  const dir = join(homedir(), "Downloads", "snaffle");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}
