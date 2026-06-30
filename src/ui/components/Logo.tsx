import { Box, Text } from "ink";
import { LOGO_LINES } from "../logo";
import { COLOR, lerpHex } from "../theme";

const WHITE = "#ffffff";

// White at the top-left, warming through light orange to deep fox orange at the
// bottom-right — a diagonal sheen across the wordmark.
function sheen(t: number): string {
  if (t < 0.5) return lerpHex(WHITE, COLOR.accent, t / 0.5);
  return lerpHex(COLOR.accent, COLOR.fox, (t - 0.5) / 0.5);
}

export function Logo() {
  const rows = LOGO_LINES.length;
  return (
    <Box flexDirection="column" alignItems="center">
      {LOGO_LINES.map((line, row) => {
        const tY = rows > 1 ? row / (rows - 1) : 0;
        const chars = [...line];
        const last = Math.max(1, chars.length - 1);
        return (
          <Box key={row}>
            {chars.map((ch, i) =>
              ch === " " ? (
                <Text key={i}> </Text>
              ) : (
                <Text key={i} bold color={sheen((i / last + tY) / 2)}>
                  {ch}
                </Text>
              ),
            )}
          </Box>
        );
      })}
    </Box>
  );
}
