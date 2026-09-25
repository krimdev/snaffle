import { Box, Text } from "ink";
import { GROUPS, RAIL_WIDTH, type Section } from "../sections";
import { Spinner } from "./Spinner";
import { COLOR, GUTTER, ICON, RULE } from "../theme";

// Presentational only: App owns sidebar navigation (so all key handling lives in
// one place). Highlights the active section and badges the queue with a live
// spinner and how many tasks are running or waiting.
export function Sidebar({
  section,
  focused,
  activeCount,
}: {
  section: Section;
  focused: boolean;
  activeCount: number;
}) {
  return (
    <Box flexDirection="column" width={RAIL_WIDTH} marginRight={1}>
      {GROUPS.map((items, gi) => (
        <Box key={gi} flexDirection="column" marginTop={gi > 0 ? 1 : 0}>
          {items.map((item) => {
            const selected = item.key === section;
            const tint = selected ? (focused ? COLOR.accent : COLOR.alt) : undefined;
            return (
              <Box key={item.key}>
                <Box width={GUTTER} flexShrink={0}>
                  {selected ? (
                    <Text color={focused ? COLOR.fox : RULE} bold={focused}>
                      {ICON.bar}
                    </Text>
                  ) : null}
                </Box>
                <Box width={2} flexShrink={0}>
                  <Text color={tint} dimColor={!selected}>
                    {item.icon}
                  </Text>
                </Box>
                <Text color={tint} dimColor={!selected} bold={selected && focused}>
                  {item.label}
                </Text>
                {item.badged && activeCount > 0 ? (
                  <Box flexShrink={0} marginLeft={1}>
                    <Spinner />
                    <Text color={COLOR.fox} bold>{` ${activeCount}`}</Text>
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
