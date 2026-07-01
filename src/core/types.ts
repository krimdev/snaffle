export type TaskKind = "download" | "convert" | "pdf";

export type TaskStatus = "queued" | "running" | "done" | "error";

export interface Task {
  id: string;
  kind: TaskKind;
  // What the user sees in the list: the URL, or the input file's name.
  title: string;
  status: TaskStatus;
  // 0..1, or undefined while we don't yet have a measurable percentage
  // (e.g. yt-dlp still resolving the page before the download starts).
  progress?: number;
  // A short live detail line: speed/eta for downloads, the output path when done.
  detail?: string;
  error?: string;
  // Where the finished file landed, set on completion.
  output?: string;
  // For download tasks: grab the audio only and save it as MP3 instead of the
  // full video. Ignored for convert tasks.
  audioOnly?: boolean;
  // For download tasks: cap the video height (1080/720/480); undefined = best.
  maxHeight?: number;
  // For convert tasks: the conversion preset id (see convert/targets).
  target?: string;
}
