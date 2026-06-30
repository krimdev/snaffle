import { Box, Text } from "ink";
import { COLOR } from "../theme";

// A fixed-width bar. `fraction` undefined renders an indeterminate dotted track
// (we know work is happening but not how far along, e.g. yt-dlp still resolving).
export function ProgressBar({
  fraction,
  width = 24,
  color = COLOR.fox,
}: {
  fraction?: number;
  width?: number;
  color?: string;
}) {
  if (fraction === undefined) {
    return (
      <Box width={width}>
        <Text dimColor>{"·".repeat(width)}</Text>
      </Box>
    );
  }
  const clamped = Math.min(1, Math.max(0, fraction));
  const filled = Math.round(clamped * width);
  return (
    <Box width={width}>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(width - filled)}</Text>
    </Box>
  );
}
