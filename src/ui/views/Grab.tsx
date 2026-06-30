import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { Panel } from "../components/Panel";
import { TextField } from "../components/TextField";
import { TaskList } from "../components/Tasks";
import { Rule } from "../components/Rule";
import { COLOR } from "../theme";
import type { Task } from "../../core/types";

type Mode = "video" | "audio";

// The "paste a link" screen: an input, a Video/Audio output toggle, and this
// session's grabs underneath.
export function Grab({
  width,
  height,
  focused,
  onSubmit,
  tasks,
}: {
  width: number;
  height: number;
  focused: boolean;
  onSubmit: (value: string, audioOnly: boolean) => void;
  tasks: Task[];
}) {
  const [mode, setMode] = useState<Mode>("video");
  const barWidth = Math.min(22, Math.max(10, width - 40));

  // ←/→ flip the output mode. The text field ignores arrows, so this never
  // fights with typing.
  useInput(
    (_input, key) => {
      if (key.leftArrow) setMode("video");
      else if (key.rightArrow) setMode("audio");
    },
    { isActive: focused },
  );

  const seg = (label: string, active: boolean) => (
    <Box marginRight={2}>
      <Text
        color={active ? COLOR.fox : undefined}
        bold={active}
        dimColor={!active}
      >
        {active ? `[ ${label} ]` : `  ${label}  `}
      </Text>
    </Box>
  );

  return (
    <Panel title="grab" width={width} height={height} focused={focused} count={`(${tasks.length})`}>
      <Box flexDirection="column">
        <Text dimColor>Paste a video link — YouTube, TikTok, Facebook, Instagram, X…</Text>
        <Box marginTop={1}>
          <TextField
            placeholder="https://…"
            onSubmit={(v) => onSubmit(v, mode === "audio")}
            isActive={focused}
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{"Save as  "}</Text>
          {seg("Video · MP4", mode === "video")}
          {seg("Audio · MP3", mode === "audio")}
          <Text dimColor>{"←/→"}</Text>
        </Box>
        <Box marginTop={1}>
          <Rule width={Math.max(4, width - 4)} />
        </Box>
        <TaskList tasks={tasks} barWidth={barWidth} empty="Nothing grabbed yet this session." />
      </Box>
    </Panel>
  );
}
