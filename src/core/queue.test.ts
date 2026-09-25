import { describe, expect, it } from "vitest";
import { TaskQueue } from "./queue";

// A job that resolves or rejects when told to, and records whether it was aborted.
function deferred() {
  let resolve!: (v: string) => void;
  let aborted = false;
  const promise = new Promise<string>((res) => {
    resolve = res;
  });
  const run = (_onP: (f?: number) => void, signal: AbortSignal) => {
    signal.addEventListener("abort", () => {
      aborted = true;
    });
    return promise;
  };
  return { run, resolve, wasAborted: () => aborted };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("TaskQueue", () => {
  it("runs a job to done and announces it", async () => {
    const q = new TaskQueue();
    const settled: string[] = [];
    q.on("settled", (t) => settled.push(t.status));
    const job = deferred();
    const task = q.addJob("job", "pdf", job.run);
    expect(task.status).toBe("running");
    job.resolve("/nowhere/out.pdf");
    await tick();
    expect(task.status).toBe("done");
    expect(task.output).toBe("/nowhere/out.pdf");
    expect(task.endedAt).toBeGreaterThanOrEqual(task.startedAt!);
    expect(settled).toEqual(["done"]);
  });

  it("cancels a running job, aborts it, and ignores its late result", async () => {
    const q = new TaskQueue();
    const job = deferred();
    const task = q.addJob("job", "pdf", job.run);
    expect(q.cancel(task.id)).toBe(true);
    expect(job.wasAborted()).toBe(true);
    expect(task.status).toBe("cancelled");
    job.resolve("/late.pdf");
    await tick();
    expect(task.status).toBe("cancelled");
    expect(task.output).toBeUndefined();
  });

  it("frees the slot on cancel, and a retry isn't clobbered by the old run", async () => {
    const q = new TaskQueue();
    const first = deferred();
    let runs = 0;
    const second = deferred();
    const task = q.addJob("job", "pdf", (onP, signal) => {
      runs++;
      return runs === 1 ? first.run(onP, signal) : second.run(onP, signal);
    });
    q.cancel(task.id);
    expect(q.activeCount).toBe(0);
    expect(q.retry(task.id)).toBe(true);
    expect(task.status).toBe("running");
    first.resolve("/stale.pdf"); // the cancelled run finishing late
    await tick();
    expect(task.status).toBe("running");
    second.resolve("/fresh.pdf");
    await tick();
    expect(task.status).toBe("done");
    expect(task.output).toBe("/fresh.pdf");
  });

  it("cancels a queued job without starting it", () => {
    const q = new TaskQueue();
    q.addJob("a", "pdf", deferred().run);
    q.addJob("b", "pdf", deferred().run);
    const third = q.addJob("c", "pdf", deferred().run);
    expect(third.status).toBe("queued"); // concurrency is 2
    q.cancel(third.id);
    expect(third.status).toBe("cancelled");
    expect(q.activeCount).toBe(2);
  });

  it("starts queued work oldest-first", async () => {
    const q = new TaskQueue();
    const a = deferred();
    q.addJob("a", "pdf", a.run);
    q.addJob("b", "pdf", deferred().run);
    const c = q.addJob("c", "pdf", deferred().run);
    const d = q.addJob("d", "pdf", deferred().run);
    a.resolve("/a.pdf");
    await tick();
    expect(c.status).toBe("running");
    expect(d.status).toBe("queued");
  });

  it("retries a failed job with the same runner", async () => {
    const q = new TaskQueue();
    let calls = 0;
    const task = q.addJob("flaky", "pdf", async () => {
      calls++;
      if (calls === 1) throw new Error("boom");
      return "/ok.pdf";
    });
    await tick();
    expect(task.status).toBe("error");
    expect(task.error).toBe("boom");
    expect(q.retry(task.id)).toBe(true);
    await tick();
    expect(task.status).toBe("done");
    expect(task.error).toBeUndefined();
    expect(calls).toBe(2);
  });

  it("removes settled tasks and clears done/cancelled ones", async () => {
    const q = new TaskQueue();
    const ok = q.addJob("ok", "pdf", async () => "/a.pdf");
    const bad = q.addJob("bad", "pdf", async () => {
      throw new Error("nope");
    });
    await tick();
    const running = q.addJob("slow", "pdf", deferred().run);
    expect(q.remove(running.id)).toBe(false); // still running
    expect(q.clearDone()).toBe(true);
    expect(q.list().map((t) => t.id)).toEqual([running.id, bad.id]);
    expect(q.remove(bad.id)).toBe(true);
    expect(q.list().map((t) => t.title)).toEqual(["slow"]);
    expect(ok.status).toBe("done");
  });
});
