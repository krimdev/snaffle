import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { basename } from "node:path";
import { statSync } from "node:fs";
import { wrapStep } from "../move";
import { COLOR, GUTTER, ICON } from "../theme";
import { probeMedia, type MediaInfo } from "../../convert/ffmpeg";
import { formatBytes, mediaKind } from "../../core/files";
import { fmtClock } from "../format";
import type { ConvertTarget } from "../../convert/targets";

function fileSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

// "video · 1920×1080 · h264 · 3:45 · 120.4 MB"
function describe(path: string, info: MediaInfo | null): string {
  const bits: string[] = [mediaKind(path) ?? "file"];
  if (info?.width && info.height) bits.push(`${info.width}×${info.height}`);
  if (info?.videoCodec) bits.push(info.videoCodec);
  else if (info?.audioCodec) bits.push(info.audioCodec);
  if (info?.durationSec) bits.push(fmtClock(info.durationSec));
  const size = formatBytes(fileSize(path));
  if (size) bits.push(size);
  return bits.join(` ${ICON.dot} `);
}

// Audio targets have a predictable bitrate, so we can say roughly how big the
// result will be. Video depends too much on content to guess honestly.
function estimate(target: ConvertTarget, info: MediaInfo | null): string {
  if (!target.kbps || !info?.durationSec) return "";
  return `~${formatBytes((target.kbps * 1000 * info.durationSec) / 8)}`;
}

// Shown after a file is picked: choose what to convert it into. The targets are
// already filtered to what makes sense for that file (video vs. audio).
export function ConvertMenu({
  file,
  targets,
  isActive,
  width,
  onChoose,
}: {
  file: string;
  targets: ConvertTarget[];
  isActive: boolean;
  width: number;
  onChoose: (target: ConvertTarget) => void;
}) {
  const [cursor, setCursor] = useState(0);
  const [info, setInfo] = useState<MediaInfo | null>(null);
  // Reset the highlight and re-read the file whenever a different one is picked.
  useEffect(() => {
    setCursor(0);
    setInfo(null);
    let live = true;
    probeMedia(file).then((i) => live && setInfo(i));
    return () => {
      live = false;
    };
  }, [file]);
  const clamped = Math.min(cursor, Math.max(0, targets.length - 1));
  const labelW = Math.max(...targets.map((t) => t.label.length)) + 3;
  const showHints = width >= labelW + 20;

  useInput(
    (_input, key) => {
      if (key.upArrow) setCursor(wrapStep(clamped, -1, targets.length));
      else if (key.downArrow) setCursor(wrapStep(clamped, 1, targets.length));
      else if (key.return || key.rightArrow) {
        const t = targets[clamped];
        if (t) onChoose(t);
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>Convert </Text>
        <Text color={COLOR.text} bold wrap="truncate-start">
          {basename(file)}
        </Text>
      </Box>
      <Text dimColor wrap="truncate-end">
        {info ? describe(file, info) : "Reading file…"}
      </Text>
      <Box marginTop={1} flexDirection="column">
        {targets.map((t, i) => {
          const here = i === clamped && isActive;
          const est = estimate(t, info);
          return (
            <Box key={t.id}>
              <Box width={GUTTER} flexShrink={0}>
                <Text color={COLOR.accent}>{here ? ICON.pointer : ""}</Text>
              </Box>
              <Box width={labelW} flexShrink={0}>
                <Text color={here ? COLOR.accent : COLOR.text} bold={here}>
                  {t.label}
                </Text>
              </Box>
              {showHints ? (
                <Box flexGrow={1} minWidth={0}>
                  <Text dimColor wrap="truncate-end">
                    {t.hint}
                    {est ? `  ${est}` : ""}
                  </Text>
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor wrap="truncate-end">
          {`Saved to your Downloads/snaffle folder. ${ICON.dot} esc to pick another file.`}
        </Text>
      </Box>
    </Box>
  );
}
