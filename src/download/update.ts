import { execFile } from "node:child_process";
import youtubeDl from "youtube-dl-exec";
import { CancelledError } from "../core/errors";
import { loadState, saveState } from "../util/state";
import { runDownload, type DownloadHandlers, type DownloadOptions } from "./ytdlp";

// Sites change constantly and a yt-dlp that's a few weeks old starts failing
// (403s, "unable to extract…"). yt-dlp can replace its own binary with `-U`, so
// we keep it fresh without the user ever knowing it exists:
//  • on launch, in the background, at most once a day;
//  • after a failed download, if we haven't checked yet this session — and when
//    that brings a newer version, the download is retried by itself.
// A download that starts while an update is in flight waits for it, so it runs
// on the new binary.

const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const UPDATE_TIMEOUT_MS = 90_000;

export interface UpdateResult {
  // A newer version was installed.
  updated: boolean;
  // The version now in place, when yt-dlp told us (e.g. "2026.08.19").
  version?: string;
}

export type UpdateListener = (event: { phase: "checking" } | ({ phase: "done" } & UpdateResult)) => void;

// What `yt-dlp -U` printed: did it install something, and which version is live?
export function parseUpdateOutput(text: string): UpdateResult {
  const done = text.match(/Updated yt-dlp to \S*?@?(\d{4}\.\d{2}\.\d{2}(?:\.\d+)?)/);
  if (done) return { updated: true, version: done[1] };
  const same = text.match(/up to date \(\S*?@?(\d{4}\.\d{2}\.\d{2}(?:\.\d+)?)/);
  if (same) return { updated: false, version: same[1] };
  return { updated: false };
}

function binaryPath(): string {
  // The wrapper exposes where it put the binary; its typings don't list it.
  return (youtubeDl as unknown as { constants: { YOUTUBE_DL_PATH: string } }).constants.YOUTUBE_DL_PATH;
}

const listeners = new Set<UpdateListener>();
let inFlight: Promise<UpdateResult> | null = null;
let checkedThisSession = false;

export function onUpdate(fn: UpdateListener): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

function emit(event: Parameters<UpdateListener>[0]): void {
  for (const l of listeners) l(event);
}

// Run `yt-dlp -U` once; concurrent callers share the same run. Never rejects —
// no network, a read-only install, a timeout all just mean "not updated".
export function updateYtDlp(): Promise<UpdateResult> {
  if (inFlight) return inFlight;
  emit({ phase: "checking" });
  inFlight = new Promise<UpdateResult>((resolve) => {
    execFile(
      binaryPath(),
      ["-U"],
      { timeout: UPDATE_TIMEOUT_MS, windowsHide: true },
      (err, stdout, stderr) => {
        const result = err ? { updated: false } : parseUpdateOutput(`${stdout}\n${stderr}`);
        // Only a completed check counts; a failed one is tried again next time.
        if (!err) {
          checkedThisSession = true;
          saveState({ ytdlpCheckedAt: Date.now() });
        }
        resolve(result);
      },
    );
  }).then((result) => {
    inFlight = null;
    emit({ phase: "done", ...result });
    return result;
  });
  return inFlight;
}

// Called once at startup: check in the background unless we did recently.
export function updateInBackground(): void {
  const last = loadState().ytdlpCheckedAt ?? 0;
  if (Date.now() - last < CHECK_EVERY_MS) return;
  void updateYtDlp();
}

export interface FreshHandlers extends DownloadHandlers {
  // The download is waiting on / being retried after a yt-dlp update.
  onUpdating?: (retrying: boolean) => void;
}

/**
 * runDownload, kept working: waits for any update in flight, and if the
 * download fails before we've checked for a newer yt-dlp this session, updates
 * and — when that installed something — tries once more.
 */
export async function runDownloadFresh(
  url: string,
  dir: string,
  handlers: FreshHandlers = {},
  options: DownloadOptions = {},
): Promise<string> {
  if (inFlight) {
    handlers.onUpdating?.(false);
    await inFlight;
    handlers.onProgress?.(undefined, "Starting…");
  }
  try {
    return await runDownload(url, dir, handlers, options);
  } catch (e) {
    if (e instanceof CancelledError || handlers.signal?.aborted || checkedThisSession) throw e;
    handlers.onUpdating?.(true);
    const { updated } = await updateYtDlp();
    if (!updated) throw e;
    if (handlers.signal?.aborted) throw new CancelledError();
    handlers.onProgress?.(undefined, "Retrying…");
    return runDownload(url, dir, handlers, options);
  }
}
