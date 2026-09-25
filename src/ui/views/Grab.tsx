import { useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Panel } from "../components/Panel";
import { TextField } from "../components/TextField";
import { Pills } from "../components/Pills";
import { TaskList, ROW_H } from "../components/Tasks";
import { Rule } from "../components/Rule";
import { COLOR, GUTTER, ICON } from "../theme";
import { wrapStep } from "../move";
import { isLocalFile, isUrl, stripQuotes } from "../../core/detect";
import { siteName, shortUrl } from "../../core/sites";
import { readClipboard } from "../../util/clipboard";
import type { Task } from "../../core/types";

type Mode = "video" | "audio";

export interface GrabOptions {
  audioOnly: boolean;
  maxHeight?: number;
  audioKbps?: number;
}

// Quality choices; undefined means "best available".
const VIDEO_Q: { label: string; height?: number }[] = [
  { label: "Best" },
  { label: "1080p", height: 1080 },
  { label: "720p", height: 720 },
  { label: "480p", height: 480 },
];
const AUDIO_Q: { label: string; kbps?: number }[] = [
  { label: "Best" },
  { label: "320k", kbps: 320 },
  { label: "192k", kbps: 192 },
  { label: "128k", kbps: 128 },
];

// How often to look for a fresh link in the clipboard while this pane has focus
// and the field is empty.
const CLIPBOARD_POLL_MS = 3000;

// Lines above the task list: blurb, field, hint line, 2 option rows, the rule
// and its margins.
const CHROME_H = 9;

// What the field currently holds, for the live badge at its right edge.
function classifyDraft(value: string): { text: string; color: string } | null {
  const v = value.trim();
  if (!v) return null;
  if (isUrl(v)) return { text: `${siteName(v)} ${ICON.done}`, color: COLOR.good };
  // Mid-typing "htt…" / "https:/" isn't wrong yet.
  if ("https://".startsWith(v.toLowerCase()) || "http://".startsWith(v.toLowerCase())) return null;
  if (isLocalFile(v)) return { text: `file ${ICON.info} Convert`, color: COLOR.accent };
  return { text: "not a link", color: COLOR.bad };
}

// The "paste a link" screen: an input, a Video/Audio toggle, a quality picker,
// and this session's grabs underneath. Spots links sitting in the clipboard and
// takes dropped local files straight to Convert.
export function Grab({
  width,
  height,
  focused,
  onSubmit,
  onDropFile,
  tasks,
  outDir,
}: {
  width: number;
  height: number;
  focused: boolean;
  onSubmit: (url: string, opts: GrabOptions) => void;
  onDropFile: (path: string) => void;
  tasks: Task[];
  outDir: string;
}) {
  const [mode, setMode] = useState<Mode>("video");
  const [vq, setVq] = useState(0);
  const [aq, setAq] = useState(0);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [clip, setClip] = useState<string | null>(null);
  // Links already grabbed (or dismissed) aren't suggested again.
  const seen = useRef(new Set<string>());
  const barWidth = Math.min(22, Math.max(10, width - 48));

  // Watch the clipboard for a link we haven't grabbed yet.
  const watching = focused && value === "";
  useEffect(() => {
    if (!watching) return;
    let live = true;
    const check = (): void => {
      readClipboard().then((text) => {
        if (!live) return;
        const t = text ? stripQuotes(text.split(/\r?\n/)[0] ?? "") : "";
        setClip(t && isUrl(t) && !seen.current.has(t) ? t : null);
      });
    };
    check();
    const timer = setInterval(check, CLIPBOARD_POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [watching]);

  const submit = (raw: string): boolean => {
    const v = stripQuotes(raw);
    if (isUrl(v)) {
      seen.current.add(v);
      setClip((c) => (c === v ? null : c));
      setError(null);
      onSubmit(v, {
        audioOnly: mode === "audio",
        maxHeight: mode === "video" ? VIDEO_Q[vq]!.height : undefined,
        audioKbps: mode === "audio" ? AUDIO_Q[aq]!.kbps : undefined,
      });
      return true;
    }
    // A file dropped onto the terminal pastes its path — hand it to Convert.
    if (isLocalFile(v)) {
      setError(null);
      onDropFile(v);
      return true;
    }
    setError("That's not a link — paste a full address like https://youtu.be/…");
    return false;
  };

  // ←/→ flip the output mode; ↑/↓ cycle the quality. Enter on an empty field
  // grabs the clipboard suggestion. The text field ignores arrows, so none of
  // this fights with typing.
  useInput(
    (_input, key) => {
      if (key.leftArrow) setMode("video");
      else if (key.rightArrow) setMode("audio");
      else if (key.upArrow || key.downArrow) {
        const d = key.upArrow ? -1 : 1;
        if (mode === "video") setVq((q) => wrapStep(q, d, VIDEO_Q.length));
        else setAq((q) => wrapStep(q, d, AUDIO_Q.length));
      } else if (key.return && value.trim() === "" && clip) {
        submit(clip);
      }
    },
    { isActive: focused },
  );

  const onChange = (next: string): void => {
    setValue(next);
    if (error) setError(null);
  };

  const badge = classifyDraft(value);
  const listH = Math.max(0, height - 2 - CHROME_H);
  const fit = Math.max(1, Math.floor(listH / ROW_H));

  return (
    <Panel title="grab" width={width} height={height} focused={focused} count={tasks.length ? `(${tasks.length})` : undefined}>
      <Box flexDirection="column">
        <Text dimColor wrap="truncate-end">
          Paste a video link — YouTube, TikTok, Facebook, Instagram, X…
        </Text>
        <Box marginTop={1}>
          <TextField
            placeholder="https://…"
            onSubmit={submit}
            isActive={focused}
            value={value}
            onChange={onChange}
            promptColor={error ? COLOR.bad : COLOR.fox}
          />
          {badge ? (
            <Box flexShrink={0} marginLeft={2}>
              <Text color={badge.color}>{badge.text}</Text>
            </Box>
          ) : null}
        </Box>
        <Box marginLeft={GUTTER}>
          {error ? (
            <Text color={COLOR.bad} wrap="truncate-end">
              {error}
            </Text>
          ) : clip && value === "" && focused ? (
            <Text wrap="truncate-end">
              <Text color={COLOR.accent}>↵ </Text>
              <Text dimColor>grab from clipboard </Text>
              <Text color={COLOR.text}>{shortUrl(clip, Math.max(16, width - 36))}</Text>
              <Text dimColor>{`  ${siteName(clip)}`}</Text>
            </Text>
          ) : (
            <Text> </Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Box width={10} flexShrink={0}>
            <Text dimColor>Save as</Text>
          </Box>
          <Pills options={["Video · MP4", "Audio · MP3"]} active={mode === "video" ? 0 : 1} focused={focused} />
          <Text dimColor>{" ←/→"}</Text>
        </Box>
        <Box>
          <Box width={10} flexShrink={0}>
            <Text dimColor>{mode === "video" ? "Quality" : "Bitrate"}</Text>
          </Box>
          {mode === "video" ? (
            <Pills options={VIDEO_Q.map((q) => q.label)} active={vq} focused={focused} />
          ) : (
            <Pills options={AUDIO_Q.map((q) => q.label)} active={aq} focused={focused} />
          )}
          <Text dimColor>{" ↑/↓"}</Text>
        </Box>
        <Box marginTop={1}>
          <Rule width={Math.max(4, width - 4)} />
        </Box>
        <TaskList
          tasks={tasks}
          barWidth={barWidth}
          limit={fit}
          empty={<EmptyGrab outDir={outDir} />}
        />
      </Box>
    </Panel>
  );
}

function EmptyGrab({ outDir }: { outDir: string }) {
  const tip = (label: string, text: string) => (
    <Box>
      <Box width={8} flexShrink={0}>
        <Text color={COLOR.alt}>{label}</Text>
      </Box>
      <Text dimColor wrap="truncate-end">
        {text}
      </Text>
    </Box>
  );
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>Nothing grabbed yet this session.</Text>
      <Box flexDirection="column" marginTop={1}>
        {tip("Tip", "Copy a link anywhere — snaffle spots it and ↵ grabs it.")}
        {tip("Tip", "Drop a video file here to convert it instead.")}
        {tip("Tip", "Grab several links in a row — they download side by side.")}
        {tip("Saved", outDir)}
      </Box>
    </Box>
  );
}
