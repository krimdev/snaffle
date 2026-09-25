import { Box, Text } from "ink";
import { useFrame } from "../useFrame";
import { COLOR } from "../theme";

const GLOW = 4;

// A fixed-width bar. `fraction` undefined renders an indeterminate track with a
// glowing segment sweeping back and forth (we know work is happening but not
// how far along, e.g. yt-dlp still resolving the page) — so it never looks
// frozen. `still` freezes it (queued tasks: nothing is happening yet).
export function ProgressBar({
  fraction,
  width = 24,
  color = COLOR.fox,
  still = false,
}: {
  fraction?: number;
  width?: number;
  color?: string;
  still?: boolean;
}) {
  const n = useFrame(fraction === undefined && !still);
  if (fraction === undefined) {
    if (still) {
      return (
        <Box width={width}>
          <Text dimColor>{"·".repeat(width)}</Text>
        </Box>
      );
    }
    const span = Math.max(1, width - GLOW);
    const cycle = span * 2;
    const step = n % cycle;
    const at = step <= span ? step : cycle - step;
    return (
      <Box width={width}>
        <Text dimColor>{"░".repeat(at)}</Text>
        <Text color={color}>{"▓".repeat(Math.min(GLOW, width))}</Text>
        <Text dimColor>{"░".repeat(Math.max(0, width - at - GLOW))}</Text>
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
