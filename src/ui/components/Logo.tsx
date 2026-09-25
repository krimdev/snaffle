import { Box, Text } from "ink";
import { LOGO_LINES } from "../logo";
import { COLOR, lerpHex } from "../theme";

const WHITE = "#ffffff";
const BAND = 0.14;

// White at the top-left, warming through light orange to deep fox orange at the
// bottom-right — a diagonal sheen across the wordmark.
function sheen(t: number): string {
  if (t < 0.5) return lerpHex(WHITE, COLOR.accent, t / 0.5);
  return lerpHex(COLOR.accent, COLOR.fox, (t - 0.5) / 0.5);
}

// `shine` (0..1, or undefined for none) positions a bright glint band sweeping
// diagonally across the letters — used by the splash and to celebrate a finish.
export function Logo({ shine }: { shine?: number }) {
  const rows = LOGO_LINES.length;
  return (
    <Box flexDirection="column" alignItems="center">
      {LOGO_LINES.map((line, row) => {
        const tY = rows > 1 ? row / (rows - 1) : 0;
        const chars = [...line];
        const last = Math.max(1, chars.length - 1);
        return (
          <Box key={row}>
            {chars.map((ch, i) => {
              if (ch === " ") return <Text key={i}> </Text>;
              const t = (i / last + tY) / 2;
              let color = sheen(t);
              if (shine !== undefined) {
                // Map shine across a range slightly wider than the logo so the
                // band enters and leaves cleanly.
                const pos = -BAND + shine * (1 + 2 * BAND);
                const d = Math.abs(t - pos);
                if (d < BAND) color = lerpHex(color, WHITE, (1 - d / BAND) * 0.85);
              }
              return (
                <Text key={i} bold color={color}>
                  {ch}
                </Text>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}
