import { EventEmitter } from "node:events";
import { basename } from "node:path";
import { runDownload } from "../download/ytdlp";
import { runConvert } from "../convert/ffmpeg";
import { targetById, DEFAULT_TARGET } from "../convert/targets";
import { stripQuotes } from "./detect";
import { outputDir } from "../util/paths";
import type { Task, TaskKind } from "./types";

// How many tasks run at once. A small cap keeps bandwidth/CPU sane while still
// letting you queue up several and walk away.
const CONCURRENCY = 2;

/**
 * Owns the list of tasks and runs them. The UI never touches yt-dlp or ffmpeg
 * directly: it adds a URL or a file path here and renders whatever the queue
 * emits. Each state change fires "update" so the view can re-render.
 */
export class TaskQueue extends EventEmitter {
  private tasks: Task[] = [];
  private running = new Set<string>();
  private seq = 0;

  list(): Task[] {
    return this.tasks;
  }

  // How many tasks are running right now (drives the sidebar badge).
  get activeCount(): number {
    let n = 0;
    for (const t of this.tasks) if (t.status === "running" || t.status === "queued") n++;
    return n;
  }

  // Drop finished tasks from the list (keeps running/queued/failed). Returns
  // whether anything was removed so the caller can decide to notify.
  clearDone(): boolean {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.status !== "done");
    if (this.tasks.length === before) return false;
    this.changed();
    return true;
  }

  add(kind: TaskKind, input: string, opts: { audioOnly?: boolean; target?: string } = {}): Task {
    const value = stripQuotes(input);
    const task: Task = {
      id: `t${++this.seq}`,
      kind,
      title: kind === "download" ? value : basename(value),
      status: "queued",
      audioOnly: kind === "download" ? opts.audioOnly : undefined,
      target: kind === "convert" ? opts.target : undefined,
    };
    // Convert tasks show the basename but run on the full path; remember it.
    if (kind === "convert") this.inputs.set(task.id, value);
    this.tasks = [task, ...this.tasks];
    this.changed();
    this.pump();
    return task;
  }

  private pump(): void {
    if (this.running.size >= CONCURRENCY) return;
    const next = this.tasks.find((t) => t.status === "queued");
    if (!next) return;
    this.start(next);
    // Fill remaining slots in the same tick.
    this.pump();
  }

  private start(task: Task): void {
    task.status = "running";
    task.progress = undefined;
    this.running.add(task.id);
    this.changed();

    // A stored runner (PDF jobs) wins; otherwise dispatch by kind.
    const job = this.runners.get(task.id);
    const run = job
      ? job()
      : task.kind === "download"
        ? runDownload(
            task.title,
            outputDir(),
            { onProgress: (f, detail) => this.onProgress(task, f, detail) },
            { audioOnly: task.audioOnly },
          )
        : runConvert(this.inputFor(task), outputDir(), targetById(task.target) ?? DEFAULT_TARGET, {
            onProgress: (f) => this.onProgress(task, f),
          });

    run
      .then((output) => {
        task.status = "done";
        task.progress = 1;
        task.output = output;
        task.detail = `saved · ${basename(output)}`;
      })
      .catch((e: unknown) => {
        task.status = "error";
        task.error = e instanceof Error ? e.message : String(e);
        task.detail = undefined;
      })
      .finally(() => {
        this.running.delete(task.id);
        this.runners.delete(task.id);
        this.changed();
        this.pump();
      });
  }

  // A self-contained job (used by the PDF tools): the queue just runs the async
  // function and reports its resolved output path, with no kind-specific logic.
  private runners = new Map<string, () => Promise<string>>();
  addJob(title: string, run: () => Promise<string>): void {
    const task: Task = { id: `t${++this.seq}`, kind: "pdf", title, status: "queued" };
    this.runners.set(task.id, run);
    this.tasks = [task, ...this.tasks];
    this.changed();
    this.pump();
  }

  // For convert tasks the title is the basename (what we show); the real path was
  // the pasted input, kept here so the queue stays the single source of truth.
  private inputs = new Map<string, string>();
  private inputFor(task: Task): string {
    return this.inputs.get(task.id) ?? task.title;
  }

  private onProgress(task: Task, fraction: number | undefined, detail?: string): void {
    task.progress = fraction;
    if (detail !== undefined) task.detail = detail;
    this.changed();
  }

  private changed(): void {
    this.emit("update");
  }
}
