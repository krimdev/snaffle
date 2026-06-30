import { existsSync, readdirSync, statSync } from "node:fs";
import { join, parse } from "node:path";

export interface Entry {
  name: string;
  path: string;
  isDir: boolean;
  sizeBytes: number;
}

const IS_WIN = process.platform === "win32";

// Extensions the convert side can actually do something with, split by kind so
// the format menu can offer sensible targets. In the browser we show only these
// (plus folders) so the list stays manageable.
const VIDEO = new Set([
  ".mp4", ".mkv", ".mov", ".avi", ".webm", ".flv", ".m4v", ".wmv", ".ts", ".mpg", ".mpeg",
]);
const AUDIO = new Set([".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".opus", ".wma"]);

export type MediaKind = "video" | "audio";

function ext(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

export function mediaKind(name: string): MediaKind | null {
  const e = ext(name);
  if (VIDEO.has(e)) return "video";
  if (AUDIO.has(e)) return "audio";
  return null;
}

export function isMediaFile(name: string): boolean {
  return mediaKind(name) !== null;
}

// Image types pdf-lib can embed (JPEG + PNG only), and PDFs — used as browser
// filters for the PDF tools.
const IMAGE = new Set([".jpg", ".jpeg", ".png"]);

export function isImageFile(name: string): boolean {
  return IMAGE.has(ext(name));
}

export function isPdfFile(name: string): boolean {
  return ext(name) === ".pdf";
}

// True when `dir` is a filesystem root (a Windows drive root like "C:\" or "/"),
// so we know whether going up means "drive list" / "nowhere".
export function isRoot(dir: string): boolean {
  return parse(dir).root === dir;
}

// Windows drives that currently exist, as selectable entries. Empty elsewhere.
// We probe A:..Z: by existence — cheap and dependency-free.
export function listDrives(): Entry[] {
  if (!IS_WIN) return [];
  const out: Entry[] = [];
  for (let c = 67; c <= 90; c++) {
    // start at C: (skip floppy A/B); include C..Z that exist
    const letter = String.fromCharCode(c);
    const root = `${letter}:\\`;
    try {
      if (existsSync(root)) {
        out.push({ name: `${letter}:`, path: root, isDir: true, sizeBytes: 0 });
      }
    } catch {
      // unreadable drive — skip
    }
  }
  return out;
}

export interface ListOpts {
  showHidden?: boolean;
  // Keep a file only if this returns true (folders always stay so you can keep
  // navigating). Omit to show every file.
  accept?: (name: string) => boolean;
}

/**
 * List a directory for the browser: folders first then files, each alphabetical
 * (case-insensitive). Unreadable entries are dropped rather than crash the list.
 */
export function listDir(dir: string, opts: ListOpts = {}): Entry[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }

  const entries: Entry[] = [];
  for (const name of names) {
    if (!opts.showHidden && name.startsWith(".")) continue;
    const path = join(dir, name);
    try {
      const st = statSync(path);
      const isDir = st.isDirectory();
      if (!isDir && opts.accept && !opts.accept(name)) continue;
      entries.push({ name, path, isDir, sizeBytes: isDir ? 0 : st.size });
    } catch {
      // unreadable entry — skip it
    }
  }

  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return entries;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
