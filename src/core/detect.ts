import { existsSync, statSync } from "node:fs";
import type { TaskKind } from "./types";

// A pasted line is one of two things: a web link to grab (download) or a path to
// a local file to convert. Anything that parses as an http(s) URL is a download;
// anything that exists on disk as a file is a convert; everything else is junk.

export function isUrl(input: string): boolean {
  try {
    const u = new URL(input.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isLocalFile(input: string): boolean {
  const p = stripQuotes(input.trim());
  try {
    return existsSync(p) && statSync(p).isFile();
  } catch {
    return false;
  }
}

// Terminals (and drag-and-drop) often wrap a path in quotes; strip one matching
// pair so `"C:\My Videos\clip.mp4"` is recognized as the file it points to.
export function stripQuotes(input: string): string {
  const s = input.trim();
  if (s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))) {
    return s.slice(1, -1);
  }
  return s;
}

export function classify(input: string): TaskKind | null {
  if (isUrl(input)) return "download";
  if (isLocalFile(input)) return "convert";
  return null;
}
