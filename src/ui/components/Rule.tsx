import { Box, Text } from "ink";
import { RULE } from "../theme";

// A thin horizontal divider, used under the header.
export function Rule({ width }: { width: number }) {
  return (
    <Box>
      <Text color={RULE}>{"─".repeat(Math.max(1, width))}</Text>
    </Box>
  );
}
