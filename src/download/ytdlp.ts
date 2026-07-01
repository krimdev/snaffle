import { join } from "node:path";
// youtube-dl-exec bundles a yt-dlp binary and exposes `.exec`, which returns the
// child process so we can stream its progress instead of waiting for the end.
import youtubeDl from "youtube-dl-exec";
// Both merging (video+audio) and audio extraction need ffmpeg; point yt-dlp at
// the static binary so there's nothing for the user to install.
import ffmpegPath from "ffmpeg-static";

export interface DownloadHandlers {
  // fraction is 0..1; detail is a human line like "12.3 MiB/s · ETA 00:42".
  onProgress?: (fraction: number | undefined, detail?: string) => void;
}

export interface DownloadOptions {
  // Grab the audio only and convert it to MP3 (instead of the merged video).
  audioOnly?: boolean;
  // Cap the video height (e.g. 1080, 720, 480). Omit for best available.
  maxHeight?: number;
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

function parseProgress(line: string): { fraction?: number; detail?: string } | null {
  if (!line.includes("[download]")) return null;
  const pct = line.match(PCT);
  if (!pct) return null;
  const fraction = Math.min(1, Math.max(0, parseFloat(pct[1]!) / 100));
  const bits = [line.match(SPEED)?.[1], line.match(ETA)?.[1] ? `ETA ${line.match(ETA)![1]}` : null]
    .filter(Boolean)
    .join(" · ");
  return { fraction, detail: bits || undefined };
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
  // %(title)s.%(ext)s keeps the platform's own title; restrict filenames so the
  // result is portable across OSes (no characters Windows would reject).
  const template = join(dir, "%(title).200B [%(id)s].%(ext)s");

  const common = {
    output: template,
    noPlaylist: true,
    newline: true,
    restrictFilenames: true,
    noPart: true,
    ...(ffmpegPath ? { ffmpegLocation: ffmpegPath } : {}),
  };

  const sub = options.audioOnly
    ? youtubeDl.exec(url, {
        ...common,
        format: "ba/b",
        extractAudio: true,
        audioFormat: "mp3",
        audioQuality: 0,
      })
    : youtubeDl.exec(url, {
        ...common,
        format: videoFormat(options.maxHeight),
        mergeOutputFormat: "mp4",
      });

  let resolved: string | undefined;
  const onLine = (chunk: Buffer): void => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (!line) continue;
      const prog = parseProgress(line);
      if (prog) handlers.onProgress?.(prog.fraction, prog.detail);
      // yt-dlp announces the final merged file: "[Merger] Merging formats into "X""
      // or "[download] Destination: X". Capture it as the output path.
      const dest = line.match(/Destination:\s+(.+)$/) ?? line.match(/Merging formats into "(.+)"$/);
      if (dest) resolved = dest[1]!.trim();
    }
  };
  sub.stdout?.on("data", onLine);
  sub.stderr?.on("data", onLine);

  await sub;
  handlers.onProgress?.(1);
  return resolved ?? dir;
}
