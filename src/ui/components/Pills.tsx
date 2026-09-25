import { Box, Text } from "ink";
import { COLOR, INK, RULE } from "../theme";

// A segmented control: the chosen option is a filled orange pill, the rest sit
// quietly beside it. Every option keeps the same padding so nothing shifts when
// the choice changes.
export function Pills({
  options,
  active,
  focused,
}: {
  options: string[];
  active: number;
  focused: boolean;
}) {
  return (
    <Box>
      {options.map((label, i) =>
        i === active ? (
          <Box key={label} marginRight={1}>
            <Text backgroundColor={focused ? COLOR.fox : RULE} color={focused ? INK : COLOR.text} bold>
              {` ${label} `}
            </Text>
          </Box>
        ) : (
          <Box key={label} marginRight={1}>
            <Text dimColor>{` ${label} `}</Text>
          </Box>
        ),
      )}
    </Box>
  );
}
