import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { basename } from "node:path";
import { wrapStep } from "../move";
import { COLOR, GUTTER, ICON } from "../theme";
import type { ConvertTarget } from "../../convert/targets";

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
  // Reset the highlight whenever a different file is picked.
  useEffect(() => setCursor(0), [file]);
  const clamped = Math.min(cursor, Math.max(0, targets.length - 1));

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
        <Text color={COLOR.text} wrap="truncate-start">
          {basename(file)}
        </Text>
        <Text dimColor> to…</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {targets.map((t, i) => {
          const here = i === clamped && isActive;
          return (
            <Box key={t.id}>
              <Box width={GUTTER} flexShrink={0}>
                <Text color={COLOR.accent}>{here ? ICON.pointer : ""}</Text>
              </Box>
              <Text color={here ? COLOR.accent : COLOR.text} bold={here}>
                {t.label}
              </Text>
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
