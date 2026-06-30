import { Panel } from "../components/Panel";
import { TaskList } from "../components/Tasks";
import type { Task } from "../../core/types";

// Everything that's running, finished, or failed, newest first.
export function Queue({
  width,
  height,
  focused,
  tasks,
}: {
  width: number;
  height: number;
  focused: boolean;
  tasks: Task[];
}) {
  const barWidth = Math.min(24, Math.max(10, width - 44));
  return (
    <Panel title="queue" width={width} height={height} focused={focused} count={`(${tasks.length})`}>
      <TaskList
        tasks={tasks}
        barWidth={barWidth}
        empty="Queue is empty — grab a link or convert a file to get going."
      />
    </Panel>
  );
}
