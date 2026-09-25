import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Panel } from "../components/Panel";
import { TaskList, ROW_H } from "../components/Tasks";
import { COLOR, ICON } from "../theme";
import { windowStart, wrapStep } from "../move";
import { isSettled, type Task } from "../../core/types";
import type { TaskQueue } from "../../core/queue";
import { openFile, revealFile } from "../../util/open";
import type { Notice } from "../components/Header";

// Everything that's running, finished, or failed, newest first — and the place
// to act on it: open a result, show it in its folder, retry a failure, cancel
// or remove. The selection follows a task (by id), not a row, so new arrivals
// at the top don't shift it.
export function Queue({
  width,
  height,
  focused,
  tasks,
  queue,
  notify,
  onSelect,
}: {
  width: number;
  height: number;
  focused: boolean;
  tasks: Task[];
  queue: TaskQueue;
  notify: (n: Notice) => void;
  onSelect: (task: Task | null) => void;
}) {
  const [selId, setSelId] = useState<string | null>(null);
  const idx = Math.max(0, tasks.findIndex((t) => t.id === selId));
  const sel = tasks[idx] ?? null;

  // Tasks mutate in place, so key the report on id + status, not identity.
  useEffect(() => onSelect(sel), [sel?.id, sel?.status, onSelect]);

  // Keep the stored id pointing at a real task (first one when it vanished).
  useEffect(() => {
    if (sel && sel.id !== selId) setSelId(sel.id);
  }, [sel, selId]);

  useInput(
    (input, key) => {
      if (tasks.length === 0) return;
      if (key.upArrow) return setSelId(tasks[wrapStep(idx, -1, tasks.length)]!.id);
      if (key.downArrow) return setSelId(tasks[wrapStep(idx, 1, tasks.length)]!.id);
      if (!sel) return;
      if ((input === "o" || key.return) && sel.status === "done" && sel.output) {
        openFile(sel.output);
        notify({ kind: "info", text: `Opening ${sel.detail ?? "file"}…` });
      } else if (input === "f" && sel.status === "done" && sel.output) {
        revealFile(sel.output);
        notify({ kind: "info", text: "Showing it in its folder…" });
      } else if (input === "r" && (sel.status === "error" || sel.status === "cancelled")) {
        if (queue.retry(sel.id)) notify({ kind: "info", text: `Retrying ${sel.title}` });
      } else if (input === "x") {
        if (!isSettled(sel)) {
          if (queue.cancel(sel.id)) notify({ kind: "info", text: `Cancelled ${sel.title}` });
        } else {
          // Move the selection to a neighbour before the row disappears.
          const next = tasks[idx + 1] ?? tasks[idx - 1];
          if (queue.remove(sel.id)) setSelId(next?.id ?? null);
        }
      }
    },
    { isActive: focused },
  );

  const barWidth = Math.min(24, Math.max(10, width - 52));
  // Panel border + one line reserved for the "more above/below" note.
  const fit = Math.max(1, Math.floor((height - 4) / ROW_H));
  const start = windowStart(idx, tasks.length, fit);
  const running = tasks.filter((t) => t.status === "running").length;
  const waiting = tasks.filter((t) => t.status === "queued").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const failed = tasks.filter((t) => t.status === "error").length;
  const summary = [
    running ? `${running} running` : "",
    waiting ? `${waiting} waiting` : "",
    done ? `${done} done` : "",
    failed ? `${failed} failed` : "",
  ]
    .filter(Boolean)
    .join(` ${ICON.dot} `);

  return (
    <Panel
      title="queue"
      width={width}
      height={height}
      focused={focused}
      count={summary ? `· ${summary}` : undefined}
    >
      <TaskList
        tasks={tasks}
        barWidth={barWidth}
        selectedId={focused ? sel?.id : null}
        start={start}
        limit={fit}
        empty={
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Queue is empty — grab a link or convert a file to get going.</Text>
            <Box marginTop={1}>
              <Text dimColor>
                Finished files show up here: <Text color={COLOR.alt}>o</Text> opens one,{" "}
                <Text color={COLOR.alt}>f</Text> shows it in its folder.
              </Text>
            </Box>
          </Box>
        }
      />
    </Panel>
  );
}
