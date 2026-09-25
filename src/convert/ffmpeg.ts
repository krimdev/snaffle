import { spawn } from "node:child_process";
import { basename, extname, join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { CancelledError } from "../core/errors";
import type { ConvertTarget } from "./targets";

export interface ConvertHandlers {
  onProgress?: (fraction: number | undefined) => void;
  // Aborting kills ffmpeg; the promise rejects with CancelledError.
  signal?: AbortSignal;
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

function noBinary(): Promise<never> {
  return Promise.reject(new Error("ffmpeg binary not found (ffmpeg-static failed to install)"));
}

// Spawn ffmpeg and report progress as time / total. `total` is either known up
// front (trim) or read from the "Duration:" line ffmpeg prints for its input.
function runFfmpeg(
  args: string[],
  output: string,
  handlers: ConvertHandlers,
  knownTotal?: number,
): Promise<string> {
  if (handlers.signal?.aborted) return Promise.reject(new CancelledError());
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, args, { windowsHide: true });

    let cancelled = false;
    const onAbort = (): void => {
      cancelled = true;
      proc.kill();
    };
    handlers.signal?.addEventListener("abort", onAbort, { once: true });

    let total = knownTotal;
    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (knownTotal === undefined) {
        const d = text.match(DURATION);
        if (d) total = toSeconds(d[1]!, d[2]!, d[3]!);
      }
      const t = text.match(TIME);
      if (t && total && total > 0) {
        handlers.onProgress?.(Math.min(1, toSeconds(t[1]!, t[2]!, t[3]!) / total));
      }
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      handlers.signal?.removeEventListener("abort", onAbort);
      if (cancelled) reject(new CancelledError());
      else if (code === 0) {
        handlers.onProgress?.(1);
        resolve(output);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
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
  if (!ffmpegPath) return noBinary();
  const output = outputPath(input, dir, target);
  return runFfmpeg(target.args(input, output), output, handlers);
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
  if (!ffmpegPath) return noBinary();
  const ext = extname(input);
  const output = join(dir, `${basename(input, ext)} (trim)${ext}`);
  const total = toSec - fromSec;
  // -ss before -i seeks fast; -t sets how long to copy.
  const args = ["-y", "-ss", String(fromSec), "-i", input, "-t", String(total), "-c", "copy", output];
  return runFfmpeg(args, output, handlers, total);
}

export interface MediaInfo {
  durationSec?: number;
  width?: number;
  height?: number;
  videoCodec?: string;
  audioCodec?: string;
}

const VIDEO_STREAM = /Stream #\S+.*?: Video: (\w+).*?, (\d{2,5})x(\d{2,5})/;
const AUDIO_STREAM = /Stream #\S+.*?: Audio: (\w+)/;

// What `ffmpeg -i file` says about its input (ffprobe isn't bundled by
// ffmpeg-static, but the plain banner carries everything we show).
export function parseMediaInfo(text: string): MediaInfo {
  const info: MediaInfo = {};
  const d = text.match(DURATION);
  if (d) info.durationSec = toSeconds(d[1]!, d[2]!, d[3]!);
  const v = text.match(VIDEO_STREAM);
  if (v) {
    info.videoCodec = v[1];
    info.width = Number(v[2]);
    info.height = Number(v[3]);
  }
  const a = text.match(AUDIO_STREAM);
  if (a) info.audioCodec = a[1];
  return info;
}

/** Read duration / resolution / codecs of a media file. Never rejects. */
export function probeMedia(input: string): Promise<MediaInfo> {
  if (!ffmpegPath) return Promise.resolve({});
  return new Promise((resolve) => {
    let text = "";
    const proc = spawn(ffmpegPath as string, ["-hide_banner", "-i", input], { windowsHide: true });
    proc.stderr.on("data", (chunk: Buffer) => (text += chunk.toString()));
    proc.on("error", () => resolve({}));
    // ffmpeg exits non-zero ("At least one output file must be specified"), which
    // is expected — the info is on stderr regardless.
    proc.on("close", () => resolve(parseMediaInfo(text)));
  });
}
