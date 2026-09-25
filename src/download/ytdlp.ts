import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
// youtube-dl-exec bundles a yt-dlp binary and exposes `.exec`, which returns the
// child process so we can stream its progress instead of waiting for the end.
import youtubeDl from "youtube-dl-exec";
// Both merging (video+audio) and audio extraction need ffmpeg; point yt-dlp at
// the static binary so there's nothing for the user to install.
import ffmpegPath from "ffmpeg-static";
import { killTree } from "../util/kill";
import { CancelledError } from "../core/errors";

export interface DownloadMeta {
  id?: string;
  title: string;
  uploader?: string;
  duration?: string;
}

export interface DownloadHandlers {
  // fraction is 0..1; detail is a human line like "12.3 MiB/s · ETA 00:42".
  onProgress?: (fraction: number | undefined, detail?: string) => void;
  // Fired once yt-dlp has resolved the page, before any bytes are fetched.
  onMeta?: (meta: DownloadMeta) => void;
  // Aborting kills yt-dlp (and the ffmpeg it may have spawned).
  signal?: AbortSignal;
}

export interface DownloadOptions {
  // Grab the audio only and convert it to MP3 (instead of the merged video).
  audioOnly?: boolean;
  // Cap the video height (e.g. 1080, 720, 480). Omit for best available.
  maxHeight?: number;
  // MP3 bitrate in kbps (e.g. 320, 192, 128). Omit for best VBR.
  audioKbps?: number;
}

// yt-dlp format selector: best video+audio, optionally capped to a max height,
// always with single-file fallbacks so odd sources still resolve.
function videoFormat(maxHeight?: number): string {
  if (!maxHeight) return "bv*+ba/b";
  return `bv*[height<=${maxHeight}]+ba/b[height<=${maxHeight}]/b[height<=${maxHeight}]/bv*+ba/b`;
}

// yt-dlp with `--newline` prints one progress line per tick. We don't trust a
// fixed column layout (it changes with flags/locale), so we pull the percentage
// and the optional speed/ETA out by pattern, wherever they sit on the line.
const PCT = /(\d+(?:\.\d+)?)%/;
const SPEED = /at\s+([\d.]+\s*[KMG]i?B\/s)/i;
const ETA = /ETA\s+([\d:]+)/i;

export function parseProgress(line: string): { fraction?: number; detail?: string } | null {
  if (!line.includes("[download]")) return null;
  const pct = line.match(PCT);
  if (!pct) return null;
  const fraction = Math.min(1, Math.max(0, parseFloat(pct[1]!) / 100));
  const bits = [line.match(SPEED)?.[1], line.match(ETA)?.[1] ? `ETA ${line.match(ETA)![1]}` : null]
    .filter(Boolean)
    .join(" · ");
  return { fraction, detail: bits || undefined };
}

// Our own tagged lines, printed via --print so we don't have to reverse-engineer
// the title from a restricted filename or guess the final path after merging.
const META_TAG = "SNAFFLE_META";
const PATH_TAG = "SNAFFLE_PATH";
const NA = "NA";

export function parseMeta(line: string): DownloadMeta | null {
  if (!line.startsWith(`${META_TAG}\t`)) return null;
  const [, title, uploader, duration, id] = line.split("\t");
  if (!title || title === NA) return null;
  const clean = (s?: string): string | undefined => (s && s !== NA ? s : undefined);
  // duration_string is bare seconds under a minute ("19"); show it as a clock.
  const d = clean(duration);
  const clock = d && /^\d+$/.test(d) ? `0:${d.padStart(2, "0")}` : d;
  return { id: clean(id), title, uploader: clean(uploader), duration: clock };
}

export function parsePath(line: string): string | null {
  if (!line.startsWith(`${PATH_TAG}\t`)) return null;
  const p = line.slice(PATH_TAG.length + 1).trim();
  return p || null;
}

// yt-dlp prints "ERROR: [site] id: reason" on failure; that's the part worth
// showing, not the wrapper's multi-line "The command spawned as…" dump.
export function friendlyError(stderr: string): string | null {
  const lines = stderr.split(/\r?\n/).filter((l) => l.startsWith("ERROR:"));
  const last = lines.at(-1);
  if (!last) return null;
  return last.replace(/^ERROR:\s*/, "").replace(/^\[[^\]]+\]\s*[\w-]+:\s*/, "");
}

// After a cancel or failure, remove the pieces yt-dlp left for this video (with
// --no-part they carry real names like "Title [id].f401.mp4"). Only files for
// this id written during this run go — an earlier complete download is older
// and stays.
function cleanupPartials(dir: string, id: string | undefined, since: number): void {
  if (!id) return;
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (!name.includes(`[${id}]`)) continue;
    const path = join(dir, name);
    try {
      if (statSync(path).mtimeMs >= since) unlinkSync(path);
    } catch {
      // locked or already gone — leave it
    }
  }
}

/**
 * Download whatever sits behind a URL (yt-dlp supports 1000+ sites) into `dir`.
 * By default merges best video+audio into an MP4; with `audioOnly` it grabs the
 * audio and saves an MP3. Resolves with the output path.
 */
export async function runDownload(
  url: string,
  dir: string,
  handlers: DownloadHandlers = {},
  options: DownloadOptions = {},
): Promise<string> {
  if (handlers.signal?.aborted) throw new CancelledError();

  // %(title)s.%(ext)s keeps the platform's own title; restrict filenames so the
  // result is portable across OSes (no characters Windows would reject).
  const template = join(dir, "%(title).200B [%(id)s].%(ext)s");

  const common = {
    output: template,
    noPlaylist: true,
    newline: true,
    restrictFilenames: true,
    noPart: true,
    // --print implies --quiet and --simulate; bring back the real download and
    // its progress lines explicitly.
    print: [
      `before_dl:${META_TAG}\t%(title)s\t%(uploader)s\t%(duration_string)s\t%(id)s`,
      `after_move:${PATH_TAG}\t%(filepath)s`,
    ],
    noSimulate: true,
    progress: true,
    ...(ffmpegPath ? { ffmpegLocation: ffmpegPath } : {}),
  };

  const sub = options.audioOnly
    ? youtubeDl.exec(url, {
        ...common,
        format: "ba/b",
        extractAudio: true,
        audioFormat: "mp3",
        // yt-dlp takes 0 (best VBR) or a bitrate like "192K"; the wrapper's
        // typings only admit the number form, but it passes the value through.
        audioQuality: (options.audioKbps ? `${options.audioKbps}K` : 0) as number,
      })
    : youtubeDl.exec(url, {
        ...common,
        format: videoFormat(options.maxHeight),
        mergeOutputFormat: "mp4",
      });

  const startedAt = Date.now() - 1000; // a little slack for coarse mtimes
  let resolved: string | undefined;
  let stderr = "";
  let metaSent = false;
  let videoId: string | undefined;
  const onLine = (chunk: Buffer): void => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (!line) continue;
      const prog = parseProgress(line);
      if (prog) {
        handlers.onProgress?.(prog.fraction, prog.detail);
        continue;
      }
      const meta = !metaSent ? parseMeta(line) : null;
      if (meta) {
        metaSent = true;
        videoId = meta.id;
        handlers.onMeta?.(meta);
        continue;
      }
      const path = parsePath(line);
      if (path) resolved = path;
    }
  };
  sub.stdout?.on("data", onLine);
  sub.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
    onLine(chunk);
  });

  let cancelled = false;
  const onAbort = (): void => {
    cancelled = true;
    if (sub.pid) killTree(sub.pid);
    else sub.kill();
  };
  handlers.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    await sub;
  } catch (e) {
    // taskkill returns before Windows releases the file handles; give it a beat.
    if (cancelled) await new Promise((r) => setTimeout(r, 500));
    cleanupPartials(dir, videoId, startedAt);
    if (cancelled) throw new CancelledError();
    throw new Error(friendlyError(stderr) ?? (e instanceof Error ? e.message.split("\n")[0]! : String(e)));
  } finally {
    handlers.signal?.removeEventListener("abort", onAbort);
  }
  if (cancelled) throw new CancelledError();
  handlers.onProgress?.(1);
  return resolved ?? dir;
}
