import { useEffect, useRef } from "react";
import type { Task } from "../core/types";

const ESC = "\u001b";
const BEL = "\u0007";

// OSC 9;4 drives the taskbar / tab progress indicator. Only some terminals know
// it — and iTerm2 reads plain OSC 9 as "post a notification" — so send it only
// where it's understood.
const PROGRESS_OK =
  !!process.env.WT_SESSION || // Windows Terminal
  process.env.ConEmuANSI === "ON" ||
  process.env.TERM_PROGRAM === "ghostty";

function write(seq: string): void {
  if (process.stdout.isTTY) process.stdout.write(seq);
}

function setTitle(title: string): void {
  write(`${ESC}]0;${title}${BEL}`);
}

// state: 0 clear · 1 normal (with %) · 2 error · 3 indeterminate
function setProgress(state: 0 | 1 | 2 | 3, pct = 0): void {
  if (PROGRESS_OK) write(`${ESC}]9;4;${state};${Math.round(pct)}${BEL}`);
}

export function resetTerminalStatus(): void {
  setProgress(0);
  setTitle("snaffle");
}

// Mirror the queue into the terminal chrome: the window/tab title shows how much
// is left, the taskbar shows overall progress, and a bell rings when everything
// you started has finished — so you can switch away and still know.
export function useTerminalStatus(tasks: Task[]): void {
  const last = useRef("");
  const wasBusy = useRef(false);

  useEffect(() => {
    const active = tasks.filter((t) => t.status === "running" || t.status === "queued");
    const failed = tasks.some((t) => t.status === "error");
    let key: string;
    if (active.length === 0) {
      key = "idle";
      if (key !== last.current) {
        setProgress(0);
        setTitle("snaffle");
        if (wasBusy.current) write(BEL);
      }
      wasBusy.current = false;
    } else {
      wasBusy.current = true;
      const known = active.filter((t) => t.progress !== undefined);
      const pct = known.length
        ? (active.reduce((sum, t) => sum + (t.progress ?? 0), 0) / active.length) * 100
        : undefined;
      key = `${active.length}:${pct === undefined ? "?" : Math.round(pct)}:${failed}`;
      if (key !== last.current) {
        if (pct === undefined) setProgress(3);
        else setProgress(failed ? 2 : 1, pct);
        const pctText = pct === undefined ? "" : `${Math.round(pct)}% · `;
        setTitle(`snaffle — ${pctText}${active.length} in progress`);
      }
    }
    last.current = key;
  }, [tasks]);

  useEffect(() => resetTerminalStatus, []);
}
