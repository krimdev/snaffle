import { Box, Text } from "ink";
import { Logo } from "./Logo";
import { LOGO_WIDTH } from "../logo";
import { COLOR, ICON } from "../theme";

// Opening card: the wordmark, the pitch, the supported sources. App dismisses it
// on a timer or the first keypress.
export function Splash({ rows, cols }: { rows: number; cols: number }) {
  const showLogo = cols >= LOGO_WIDTH + 2;
  return (
    <Box
      height={Math.max(1, rows - 1)}
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      {showLogo ? (
        <Logo />
      ) : (
        <Text color={COLOR.accent} bold>
          snaffle
        </Text>
      )}
      <Box marginTop={2}>
        <Text color={COLOR.text}>Grab any video, convert anything — right here.</Text>
      </Box>
      <Box>
        <Text dimColor>{`YouTube  ${ICON.dot}  TikTok  ${ICON.dot}  Facebook  ${ICON.dot}  Instagram  ${ICON.dot}  1000+ more`}</Text>
      </Box>
      <Box marginTop={2}>
        <Text dimColor>press any key to start</Text>
      </Box>
    </Box>
  );
}
