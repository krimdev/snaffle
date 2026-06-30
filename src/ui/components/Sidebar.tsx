import { Box, Text } from "ink";
import { GROUPS, RAIL_WIDTH, type Section } from "../sections";
import { COLOR, GUTTER, ICON, RULE } from "../theme";

// Presentational only: App owns sidebar navigation (so all key handling lives in
// one place). Highlights the active section and badges the queue with how many
// tasks are running.
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
            const badge = item.badged && activeCount > 0 ? ` (${activeCount})` : "";
            return (
              <Box key={item.key}>
                <Box width={GUTTER} flexShrink={0}>
                  {selected ? (
                    <Text color={focused ? COLOR.fox : RULE} bold={focused}>
                      {ICON.bar}
                    </Text>
                  ) : null}
                </Box>
                <Text
                  color={selected ? (focused ? COLOR.accent : COLOR.alt) : undefined}
                  dimColor={!selected}
                  bold={selected && focused}
                >
                  {item.label}
                </Text>
                {badge ? (
                  <Box flexShrink={0}>
                    <Text dimColor>{badge}</Text>
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
