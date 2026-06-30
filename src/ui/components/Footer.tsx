import { Box, Text } from "ink";
import { COLOR } from "../theme";

export interface Hint {
  keys: string;
  label: string;
}

// The contextual key hint row at the bottom of the screen.
export function Footer({ hints }: { hints: Hint[] }) {
  return (
    <Box>
      <Text>
        {hints.map((h, i) => (
          <Text key={h.keys + h.label}>
            {i > 0 ? <Text dimColor>{"   "}</Text> : null}
            <Text color={COLOR.alt}>{h.keys}</Text>
            <Text dimColor>{` ${h.label}`}</Text>
          </Text>
        ))}
      </Text>
    </Box>
  );
}
