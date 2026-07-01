import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { Panel } from "../components/Panel";
import { TextField } from "../components/TextField";
import { TaskList } from "../components/Tasks";
import { Rule } from "../components/Rule";
import { COLOR } from "../theme";
import { wrapStep } from "../move";
import type { Task } from "../../core/types";

type Mode = "video" | "audio";

// Quality choices for video mode; undefined height means "best available".
const QUALITY: { label: string; height?: number }[] = [
  { label: "Best" },
  { label: "1080p", height: 1080 },
  { label: "720p", height: 720 },
  { label: "480p", height: 480 },
];

// The "paste a link" screen: an input, a Video/Audio toggle, a quality picker
// (video only), and this session's grabs underneath.
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
  onSubmit: (value: string, audioOnly: boolean, maxHeight?: number) => void;
  tasks: Task[];
}) {
  const [mode, setMode] = useState<Mode>("video");
  const [quality, setQuality] = useState(0); // index into QUALITY
  const barWidth = Math.min(22, Math.max(10, width - 40));

  // ←/→ flip the output mode; ↑/↓ cycle the video quality. The text field
  // ignores arrows, so none of this fights with typing.
  useInput(
    (_input, key) => {
      if (key.leftArrow) setMode("video");
      else if (key.rightArrow) setMode("audio");
      else if (mode === "video" && key.upArrow) setQuality((q) => wrapStep(q, -1, QUALITY.length));
      else if (mode === "video" && key.downArrow) setQuality((q) => wrapStep(q, 1, QUALITY.length));
    },
    { isActive: focused },
  );

  const seg = (label: string, active: boolean) => (
    <Box marginRight={2}>
      <Text color={active ? COLOR.fox : undefined} bold={active} dimColor={!active}>
        {active ? `[ ${label} ]` : `  ${label}  `}
      </Text>
    </Box>
  );

  const submit = (v: string): void =>
    onSubmit(v, mode === "audio", mode === "video" ? QUALITY[quality]!.height : undefined);

  return (
    <Panel title="grab" width={width} height={height} focused={focused} count={`(${tasks.length})`}>
      <Box flexDirection="column">
        <Text dimColor>Paste a video link — YouTube, TikTok, Facebook, Instagram, X…</Text>
        <Box marginTop={1}>
          <TextField placeholder="https://…" onSubmit={submit} isActive={focused} />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{"Save as   "}</Text>
          {seg("Video · MP4", mode === "video")}
          {seg("Audio · MP3", mode === "audio")}
          <Text dimColor>{"←/→"}</Text>
        </Box>
        {mode === "video" ? (
          <Box>
            <Text dimColor>{"Quality   "}</Text>
            {QUALITY.map((q, i) => seg(q.label, i === quality))}
            <Text dimColor>{"↑/↓"}</Text>
          </Box>
        ) : null}
        <Box marginTop={1}>
          <Rule width={Math.max(4, width - 4)} />
        </Box>
        <TaskList tasks={tasks} barWidth={barWidth} empty="Nothing grabbed yet this session." />
      </Box>
    </Panel>
  );
}
