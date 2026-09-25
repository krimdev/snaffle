import { useEffect, useState } from "react";

// One shared animation clock for every spinner and shimmer on screen, so they
// move in step and we run a single timer — and none at all when nothing is
// animating (idle screens don't redraw).
const FRAME_MS = 90;
const listeners = new Set<(n: number) => void>();
let frame = 0;
let timer: NodeJS.Timeout | null = null;

function subscribe(fn: (n: number) => void): () => void {
  listeners.add(fn);
  if (!timer) {
    timer = setInterval(() => {
      frame++;
      for (const l of listeners) l(frame);
    }, FRAME_MS);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useFrame(active = true): number {
  const [n, setN] = useState(frame);
  useEffect(() => (active ? subscribe(setN) : undefined), [active]);
  return n;
}


// A one-shot 0→1 sweep lasting `durationMs`, restarted whenever `key` changes to
// a new non-zero value. Returns undefined when idle. Drives the logo glint.
export function useSweep(key: number, durationMs: number): number | undefined {
  const [startAt, setStartAt] = useState<number | null>(null);
  useEffect(() => {
    if (key > 0) setStartAt(Date.now());
  }, [key]);
  const elapsed = startAt === null ? Infinity : Date.now() - startAt;
  const active = elapsed < durationMs;
  useFrame(active);
  return active ? elapsed / durationMs : undefined;
}
