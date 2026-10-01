import { EventEmitter } from "node:events";
import { statSync } from "node:fs";
import { basename } from "node:path";
import { runDownloadFresh } from "../download/update";
import { runConvert } from "../convert/ffmpeg";
import { targetById, DEFAULT_TARGET } from "../convert/targets";
import { CancelledError } from "./errors";
import { stripQuotes } from "./detect";
import { outputDir } from "../util/paths";
import { isSettled, type Task, type TaskKind } from "./types";

// How many tasks run at once. A small cap keeps bandwidth/CPU sane while still
// letting you queue up several and walk away.
const CONCURRENCY = 2;

// A self-contained job: gets a progress reporter and an abort signal (which it
// may ignore — the queue still marks the task cancelled), resolves the output.
export type JobRunner = (onProgress: (f?: number) => void, signal: AbortSignal) => Promise<string>;

/**
 * Owns the list of tasks and runs them. The UI never touches yt-dlp or ffmpeg
 * directly: it adds a URL or a file path here and renders whatever the queue
 * emits. Each state change fires "update"; a task finishing (any outcome) also
 * fires "settled" with the task, for notifications.
 */
export class TaskQueue extends EventEmitter {
  private tasks: Task[] = [];
  private running = new Map<string, AbortController>();
  private seq = 0;

  list(): Task[] {
    return this.tasks;
  }

  // How many tasks are running or waiting (drives the sidebar badge).
  get activeCount(): number {
    let n = 0;
    for (const t of this.tasks) if (t.status === "running" || t.status === "queued") n++;
    return n;
  }

  // Drop finished and cancelled tasks (keeps running/queued/failed). Returns
  // whether anything was removed so the caller can decide to notify.
  clearDone(): boolean {
    const before = this.tasks.length;
    const keep = (t: Task): boolean => t.status !== "done" && t.status !== "cancelled";
    for (const t of this.tasks) if (!keep(t)) this.forget(t.id);
    this.tasks = this.tasks.filter(keep);
    if (this.tasks.length === before) return false;
    this.changed();
    return true;
  }

  // Stop a queued or running task. Returns whether anything changed.
  cancel(id: string): boolean {
    const task = this.tasks.find((t) => t.id === id);
    if (!task || isSettled(task)) return false;
    this.running.get(id)?.abort();
    // Free the slot now: the runner may take a moment to die (or ignore the
    // signal entirely, like the PDF jobs); its late result is dropped because
    // it no longer owns the task (see `current` in start()).
    this.running.delete(id);
    task.status = "cancelled";
    task.detail = undefined;
    task.endedAt = Date.now();
    this.changed();
    this.emit("settled", task);
    this.pump();
    return true;
  }

  // Put a failed or cancelled task back in line.
  retry(id: string): boolean {
    const task = this.tasks.find((t) => t.id === id);
    if (!task || (task.status !== "error" && task.status !== "cancelled")) return false;
    task.status = "queued";
    task.progress = undefined;
    task.detail = undefined;
    task.error = undefined;
    task.output = undefined;
    task.outputBytes = undefined;
    task.startedAt = undefined;
    task.endedAt = undefined;
    this.changed();
    this.pump();
    return true;
  }

  // Take a settled task off the list.
  remove(id: string): boolean {
    const task = this.tasks.find((t) => t.id === id);
    if (!task || !isSettled(task)) return false;
    this.forget(id);
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.changed();
    return true;
  }

  add(
    kind: TaskKind,
    input: string,
    opts: { audioOnly?: boolean; maxHeight?: number; audioKbps?: number; target?: string } = {},
  ): Task {
    const value = stripQuotes(input);
    const task: Task = {
      id: `t${++this.seq}`,
      kind,
      title: kind === "download" ? value : basename(value),
      status: "queued",
      url: kind === "download" ? value : undefined,
      audioOnly: kind === "download" ? opts.audioOnly : undefined,
      maxHeight: kind === "download" ? opts.maxHeight : undefined,
      audioKbps: kind === "download" ? opts.audioKbps : undefined,
      target: kind === "convert" ? opts.target : undefined,
    };
    // Convert tasks show the basename but run on the full path; remember it.
    if (kind === "convert") this.inputs.set(task.id, value);
    this.tasks = [task, ...this.tasks];
    this.changed();
    this.pump();
    return task;
  }

  // A self-contained job (PDF tools, trim): the queue runs the async function
  // and records its resolved output path, with no kind-specific logic. `kind`
  // only tags the row. The runner is kept so the job can be retried.
  addJob(title: string, kind: TaskKind, run: JobRunner): Task {
    const task: Task = { id: `t${++this.seq}`, kind, title, status: "queued" };
    this.runners.set(task.id, run);
    this.tasks = [task, ...this.tasks];
    this.changed();
    this.pump();
    return task;
  }

  private runners = new Map<string, JobRunner>();

  // For convert tasks the title is the basename (what we show); the real path was
  // the pasted input, kept here so the queue stays the single source of truth.
  private inputs = new Map<string, string>();
  private inputFor(task: Task): string {
    return this.inputs.get(task.id) ?? task.title;
  }

  private forget(id: string): void {
    this.runners.delete(id);
    this.inputs.delete(id);
  }

  private pump(): void {
    if (this.running.size >= CONCURRENCY) return;
    const next = [...this.tasks].reverse().find((t) => t.status === "queued");
    if (!next) return;
    this.start(next);
    // Fill remaining slots in the same tick.
    this.pump();
  }

  private start(task: Task): void {
    const ctl = new AbortController();
    task.status = "running";
    task.progress = undefined;
    task.startedAt = Date.now();
    this.running.set(task.id, ctl);
    this.changed();

    const onProgress = (f: number | undefined, detail?: string): void => {
      if (this.running.get(task.id) !== ctl) return;
      task.progress = f;
      if (detail !== undefined) task.detail = detail;
      this.changed();
    };

    // A stored runner (PDF / trim jobs) wins; otherwise dispatch by kind.
    const job = this.runners.get(task.id);
    const run = job
      ? job((f) => onProgress(f), ctl.signal)
      : task.kind === "download"
        ? runDownloadFresh(
            task.url ?? task.title,
            outputDir(),
            {
              onProgress,
              onUpdating: (retrying) =>
                onProgress(undefined, retrying ? "Updating the downloader, then retrying…" : "Updating the downloader…"),
              onMeta: (meta) => {
                task.title = meta.title;
                task.subtitle = [meta.uploader, meta.duration].filter(Boolean).join(" · ") || undefined;
                this.changed();
              },
              signal: ctl.signal,
            },
            { audioOnly: task.audioOnly, maxHeight: task.maxHeight, audioKbps: task.audioKbps },
          )
        : runConvert(this.inputFor(task), outputDir(), targetById(task.target) ?? DEFAULT_TARGET, {
            onProgress: (f) => onProgress(f),
            signal: ctl.signal,
          });

    // This run still owns the task (not cancelled, not superseded by a retry).
    const current = (): boolean => this.running.get(task.id) === ctl;

    run
      .then((output) => {
        if (!current()) return;
        task.status = "done";
        task.progress = 1;
        task.output = output;
        task.detail = basename(output);
        try {
          task.outputBytes = statSync(output).size;
        } catch {
          task.outputBytes = undefined;
        }
        task.endedAt = Date.now();
        this.emit("settled", task);
      })
      .catch((e: unknown) => {
        if (!current()) return;
        if (e instanceof CancelledError) {
          task.status = "cancelled";
          task.detail = undefined;
        } else {
          task.status = "error";
          task.error = e instanceof Error ? e.message : String(e);
          task.detail = undefined;
        }
        task.endedAt = Date.now();
        this.emit("settled", task);
      })
      .finally(() => {
        if (!current()) return;
        this.running.delete(task.id);
        this.changed();
        this.pump();
      });
  }

  private changed(): void {
    this.emit("update");
  }
}
