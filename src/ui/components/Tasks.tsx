import type { ReactNode } from "react";
import { Box, Text } from "ink";
import { ProgressBar } from "./ProgressBar";
import { Spinner } from "./Spinner";
import { COLOR, GUTTER, ICON } from "../theme";
import { formatBytes } from "../../core/files";
import { fmtElapsed } from "../format";
import type { Task, TaskKind } from "../../core/types";

// Every row is exactly this many lines (blank spacer + title + status), so lists
// can work out how many fit.
export const ROW_H = 3;

const KIND_ICON: Record<TaskKind, string> = {
  download: ICON.grab,
  convert: ICON.convert,
  pdf: ICON.pdf,
};

function pct(fraction?: number): string {
  if (fraction === undefined) return "    ";
  return `${Math.round(fraction * 100)}%`.padStart(4);
}

function StatusIcon({ task }: { task: Task }) {
  switch (task.status) {
    case "running":
      return <Spinner />;
    case "done":
      return <Text color={COLOR.good}>{ICON.done}</Text>;
    case "error":
      return <Text color={COLOR.bad}>{ICON.fail}</Text>;
    case "cancelled":
      return <Text dimColor>{ICON.cancelled}</Text>;
    default:
      return <Text dimColor>{ICON.queued}</Text>;
  }
}

// Line two, after the bar/icon column: what's happening or what came of it.
function StatusLine({ task, barWidth }: { task: Task; barWidth: number }) {
  if (task.status === "error") {
    return (
      <Text color={COLOR.bad} wrap="truncate-end">
        {task.error}
      </Text>
    );
  }
  if (task.status === "cancelled") {
    return <Text dimColor>Cancelled</Text>;
  }
  if (task.status === "done") {
    const took = task.startedAt && task.endedAt ? fmtElapsed(task.endedAt - task.startedAt) : "";
    const bits = [task.detail, task.outputBytes ? formatBytes(task.outputBytes) : "", took ? `in ${took}` : ""]
      .filter(Boolean)
      .join(` ${ICON.dot} `);
    return (
      <Text color={COLOR.good} wrap="truncate-end">
        {bits}
      </Text>
    );
  }
  const waiting = task.status === "queued";
  return (
    <>
      <ProgressBar fraction={task.progress} width={barWidth} still={waiting} />
      <Box marginLeft={1} flexShrink={0}>
        <Text dimColor>{pct(task.progress)}</Text>
      </Box>
      <Box marginLeft={1} flexGrow={1} minWidth={0}>
        <Text dimColor wrap="truncate-end">
          {waiting ? "Waiting…" : task.detail ?? (task.progress === undefined ? "Starting…" : "")}
        </Text>
      </Box>
    </>
  );
}

export function TaskRow({
  task,
  barWidth = 22,
  selected = false,
}: {
  task: Task;
  barWidth?: number;
  selected?: boolean;
}) {
  const titleColor = selected ? COLOR.accent : task.status === "cancelled" ? undefined : COLOR.text;
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Box width={GUTTER} flexShrink={0}>
          <Text color={COLOR.accent}>{selected ? ICON.pointer : ""}</Text>
        </Box>
        <Box width={2} flexShrink={0}>
          <StatusIcon task={task} />
        </Box>
        <Box width={2} flexShrink={0}>
          <Text dimColor>{KIND_ICON[task.kind]}</Text>
        </Box>
        <Box flexGrow={1} minWidth={0}>
          <Text color={titleColor} dimColor={task.status === "cancelled"} bold={selected} wrap="truncate-end">
            {task.title}
          </Text>
        </Box>
        {task.subtitle ? (
          <Box flexShrink={0} marginLeft={2}>
            <Text dimColor wrap="truncate-end">
              {task.subtitle}
            </Text>
          </Box>
        ) : null}
      </Box>
      <Box marginLeft={GUTTER + 4}>
        <StatusLine task={task} barWidth={barWidth} />
      </Box>
    </Box>
  );
}

export function TaskList({
  tasks,
  barWidth,
  empty,
  selectedId,
  start = 0,
  limit,
}: {
  tasks: Task[];
  barWidth?: number;
  empty: ReactNode;
  selectedId?: string | null;
  start?: number;
  limit?: number;
}) {
  if (tasks.length === 0) {
    return typeof empty === "string" ? (
      <Box marginTop={1}>
        <Text dimColor>{empty}</Text>
      </Box>
    ) : (
      <>{empty}</>
    );
  }
  const shown = limit === undefined ? tasks.slice(start) : tasks.slice(start, start + limit);
  const hiddenAbove = start;
  const hiddenBelow = tasks.length - start - shown.length;
  return (
    <Box flexDirection="column">
      {shown.map((t) => (
        <TaskRow key={t.id} task={t} barWidth={barWidth} selected={t.id === selectedId} />
      ))}
      {hiddenAbove > 0 || hiddenBelow > 0 ? (
        <Box marginTop={1} marginLeft={GUTTER + 4}>
          <Text dimColor>
            {[hiddenAbove > 0 ? `${hiddenAbove} more above` : "", hiddenBelow > 0 ? `${hiddenBelow} more below` : ""]
              .filter(Boolean)
              .join(` ${ICON.dot} `)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
