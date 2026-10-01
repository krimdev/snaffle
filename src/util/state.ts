import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// A tiny bit of memory between runs: where you last browsed, and whether you've
// already seen the full splash. Stored as JSON in the usual per-user config spot.
export interface State {
  lastDir?: string;
  launches?: number;
  // When we last asked yt-dlp to update itself (ms since epoch).
  ytdlpCheckedAt?: number;
}

function statePath(): string {
  const base =
    process.platform === "win32"
      ? (process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"))
      : (process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"));
  return join(base, "snaffle", "state.json");
}

let cache: State | null = null;

export function loadState(): State {
  if (cache) return cache;
  try {
    cache = JSON.parse(readFileSync(statePath(), "utf8")) as State;
  } catch {
    cache = {};
  }
  return cache;
}

export function saveState(patch: Partial<State>): void {
  cache = { ...loadState(), ...patch };
  try {
    const p = statePath();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(cache, null, 2));
  } catch {
    // read-only home or similar — memory is a nicety, not a requirement
  }
}

// Where the file browsers open: the last folder you used if it still exists,
// else Downloads, else home.
export function startDir(): string {
  const last = loadState().lastDir;
  if (last && existsSync(last)) return last;
  const downloads = join(homedir(), "Downloads");
  return existsSync(downloads) ? downloads : homedir();
}
