import { Box, Text } from "ink";
import { ProgressBar } from "./ProgressBar";
import { COLOR, ICON } from "../theme";
import type { Task } from "../../core/types";

function pct(fraction?: number): string {
  if (fraction === undefined) return "  · ";
  return `${Math.round(fraction * 100)}%`.padStart(4);
}

export function TaskRow({ task, barWidth = 22 }: { task: Task; barWidth?: number }) {
  const kindTag = task.kind === "download" ? "get " : "conv";
  const color =
    task.status === "done" ? COLOR.good : task.status === "error" ? COLOR.bad : COLOR.fox;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Box width={5} flexShrink={0}>
          <Text dimColor>{kindTag}</Text>
        </Box>
        <Box flexGrow={1} minWidth={0}>
          <Text color={COLOR.text} wrap="truncate-end">
            {task.title}
          </Text>
        </Box>
      </Box>
      <Box marginLeft={5}>
        {task.status === "error" ? (
          <Text color={COLOR.bad} wrap="truncate-end">
            {ICON.fail} {task.error}
          </Text>
        ) : (
          <>
            <ProgressBar fraction={task.progress} width={barWidth} color={color} />
            <Box marginLeft={1} flexShrink={0}>
              <Text dimColor>{pct(task.progress)}</Text>
            </Box>
            {task.detail ? (
              <Box marginLeft={1} flexGrow={1} minWidth={0}>
                <Text
                  color={task.status === "done" ? COLOR.good : undefined}
                  dimColor={task.status !== "done"}
                  wrap="truncate-end"
                >
                  {task.status === "done" ? `${ICON.done} ` : ""}
                  {task.detail}
                </Text>
              </Box>
            ) : null}
          </>
        )}
      </Box>
    </Box>
  );
}

export function TaskList({
  tasks,
  barWidth,
  empty,
}: {
  tasks: Task[];
  barWidth?: number;
  empty: string;
}) {
  if (tasks.length === 0) {
    return (
      <Box marginTop={1}>
        <Text dimColor>{empty}</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} barWidth={barWidth} />
      ))}
    </Box>
  );
}
