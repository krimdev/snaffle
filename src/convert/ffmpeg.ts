import { spawn } from "node:child_process";
import { basename, extname, join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import type { ConvertTarget } from "./targets";

export interface ConvertHandlers {
  onProgress?: (fraction: number | undefined) => void;
}

// ffmpeg reports neither a percentage nor a total up front: it prints the media
// "Duration:" once, then a running "time=" on every status line. We derive the
// fraction ourselves as time / duration.
const DURATION = /Duration:\s+(\d+):(\d+):(\d+(?:\.\d+)?)/;
const TIME = /time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)/;

function toSeconds(h: string, m: string, s: string): number {
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function outputPath(input: string, dir: string, target: ConvertTarget): string {
  const base = basename(input, extname(input));
  const tail = target.suffix ? ` (${target.suffix})` : "";
  return join(dir, `${base}${tail}.${target.ext}`);
}

/**
 * Run a conversion preset over `input`, writing into `dir`. Resolves with the
 * output path. Progress is derived from ffmpeg's time vs. the media duration.
 */
export function runConvert(
  input: string,
  dir: string,
  target: ConvertTarget,
  handlers: ConvertHandlers = {},
): Promise<string> {
  if (!ffmpegPath) {
    return Promise.reject(new Error("ffmpeg binary not found (ffmpeg-static failed to install)"));
  }
  const output = outputPath(input, dir, target);

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, target.args(input, output));

    let total: number | undefined;
    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const d = text.match(DURATION);
      if (d) total = toSeconds(d[1]!, d[2]!, d[3]!);
      const t = text.match(TIME);
      if (t && total && total > 0) {
        handlers.onProgress?.(Math.min(1, toSeconds(t[1]!, t[2]!, t[3]!) / total));
      }
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        handlers.onProgress?.(1);
        resolve(output);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

/**
 * Cut the section [fromSec, toSec) out of a media file, keeping its original
 * container and codecs (stream copy — fast and lossless). Resolves with the
 * output path.
 */
export function runTrim(
  input: string,
  fromSec: number,
  toSec: number,
  dir: string,
  handlers: ConvertHandlers = {},
): Promise<string> {
  if (!ffmpegPath) {
    return Promise.reject(new Error("ffmpeg binary not found (ffmpeg-static failed to install)"));
  }
  const ext = extname(input);
  const output = join(dir, `${basename(input, ext)} (trim)${ext}`);
  const total = toSec - fromSec;

  return new Promise((resolve, reject) => {
    // -ss before -i seeks fast; -t sets how long to copy.
    const proc = spawn(ffmpegPath as string, [
      "-y", "-ss", String(fromSec), "-i", input, "-t", String(total), "-c", "copy", output,
    ]);

    proc.stderr.on("data", (chunk: Buffer) => {
      const t = chunk.toString().match(TIME);
      if (t && total > 0) handlers.onProgress?.(Math.min(1, toSeconds(t[1]!, t[2]!, t[3]!) / total));
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        handlers.onProgress?.(1);
        resolve(output);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}
