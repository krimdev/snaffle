import { Box, Text } from "ink";
import { Logo } from "./Logo";
import { Rule } from "./Rule";
import { COLOR } from "../theme";

// The persistent top banner: the wordmark centered, a reserved line for the
// status notice (so the layout never jumps), and a full-width divider. On short
// or narrow terminals it falls back to a one-line bold name.
export function Header({
  width,
  big,
  notice,
}: {
  width: number;
  big: boolean;
  notice: string | null;
}) {
  return (
    <Box flexDirection="column">
      <Box width={width} flexDirection="column" alignItems="center">
        {big ? (
          <Logo />
        ) : (
          <Text color={COLOR.accent} bold>
            snaffle
          </Text>
        )}
        <Text color={COLOR.good}>{notice ?? " "}</Text>
      </Box>
      <Rule width={width} />
    </Box>
  );
}

// Rows the header occupies, so the layout can reserve space for it.
export function headerHeight(big: boolean): number {
  // big: logo(5) + notice + rule = 7; small: name + notice + rule = 3
  return big ? 7 : 3;
}
