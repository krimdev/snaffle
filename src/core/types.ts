export type TaskKind = "download" | "convert" | "pdf";

export type TaskStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface Task {
  id: string;
  kind: TaskKind;
  // What the user sees in the list: the video's real title once yt-dlp has
  // resolved it (the URL until then), or the input file's name.
  title: string;
  // A quiet second line of context: "uploader · 3:45" for downloads.
  subtitle?: string;
  status: TaskStatus;
  // 0..1, or undefined while we don't yet have a measurable percentage
  // (e.g. yt-dlp still resolving the page before the download starts).
  progress?: number;
  // A short live detail line: speed/eta for downloads, the output path when done.
  detail?: string;
  error?: string;
  // Where the finished file landed, set on completion.
  output?: string;
  // Size of the finished file, when we could stat it.
  outputBytes?: number;
  // Wall-clock bookkeeping (ms since epoch) so rows can show "done in 12s".
  startedAt?: number;
  endedAt?: number;
  // For download tasks: the pasted URL (the title is replaced by the real one).
  url?: string;
  // For download tasks: grab the audio only and save it as MP3 instead of the
  // full video. Ignored for convert tasks.
  audioOnly?: boolean;
  // For download tasks: cap the video height (1080/720/480); undefined = best.
  maxHeight?: number;
  // For audio downloads: target MP3 bitrate in kbps; undefined = best VBR.
  audioKbps?: number;
  // For convert tasks: the conversion preset id (see convert/targets).
  target?: string;
}

// Finished one way or another — nothing more will happen unless retried.
export function isSettled(t: Task): boolean {
  return t.status === "done" || t.status === "error" || t.status === "cancelled";
}
